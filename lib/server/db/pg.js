// Generated by CoffeeScript 1.6.3
var PgDb, defaultOptions, pg;

pg = require('pg')["native"];

defaultOptions = {
  schema: 'sharejs',
  client: null,
  uri: null,
  create_tables_automatically: true,
  operations_table: 'ops',
  snapshot_table: 'snapshots'
};

module.exports = PgDb = function(options) {
  var client, k, operations_table, snapshot_table, v,
    _this = this;
  if (!(this instanceof PgDb)) {
    return new Db;
  }
  if (options == null) {
    options = {};
  }
  for (k in defaultOptions) {
    v = defaultOptions[k];
    if (options[k] == null) {
      options[k] = v;
    }
  }
  client = options.client || new pg.Client(options.uri);
  client.connect();
  snapshot_table = options.schema && ("" + options.schema + "." + options.snapshot_table) || options.snapshot_table;
  operations_table = options.schema && ("" + options.schema + "." + options.operations_table) || options.operations_table;
  this.close = function() {
    return client.end();
  };
  this.initialize = function(callback) {
    var sql;
    console.warn('Creating postgresql database tables');
    sql = "CREATE SCHEMA " + options.schema + ";\n\nCREATE TABLE " + snapshot_table + " (\n  doc text NOT NULL,\n  v int4 NOT NULL,\n  type text NOT NULL,\n  snapshot text NOT NULL,\n  meta text NOT NULL,\n  created_at timestamp(6) NOT NULL,\n  CONSTRAINT snapshots_pkey PRIMARY KEY (doc, v)\n);\n\nCREATE TABLE " + operations_table + " (\n  doc text NOT NULL,\n  v int4 NOT NULL,\n  op text NOT NULL,\n  meta text NOT NULL,\n  CONSTRAINT operations_pkey PRIMARY KEY (doc, v)\n);";
    return client.query(sql, function(error, result) {
      return typeof callback === "function" ? callback(error != null ? error.message : void 0) : void 0;
    });
  };
  this.dropTables = function(callback) {
    var sql;
    sql = "DROP SCHEMA " + options.schema + " CASCADE;";
    return client.query(sql, function(error, result) {
      return typeof callback === "function" ? callback(error.message) : void 0;
    });
  };
  this.create = function(docName, docData, callback) {
    var sql, values;
    sql = "INSERT INTO " + snapshot_table + " (\"doc\", \"v\", \"snapshot\", \"meta\", \"type\", \"created_at\")\n  VALUES ($1, $2, $3, $4, $5, now())";
    values = [docName, docData.v, JSON.stringify(docData.snapshot), JSON.stringify(docData.meta), docData.type];
    return client.query(sql, values, function(error, result) {
      if (error == null) {
        return typeof callback === "function" ? callback() : void 0;
      } else if (error.toString().match("duplicate key value violates unique constraint")) {
        return typeof callback === "function" ? callback("Document already exists") : void 0;
      } else {
        return typeof callback === "function" ? callback(error != null ? error.message : void 0) : void 0;
      }
    });
  };
  this["delete"] = function(docName, dbMeta, callback) {
    var sql, values;
    sql = "DELETE FROM " + operations_table + "\nWHERE \"doc\" = $1\nRETURNING *";
    values = [docName];
    return client.query(sql, values, function(error, result) {
      if (error == null) {
        sql = "DELETE FROM " + snapshot_table + "\nWHERE \"doc\" = $1\nRETURNING *";
        return client.query(sql, values, function(error, result) {
          if ((error == null) && result.rows.length > 0) {
            return typeof callback === "function" ? callback() : void 0;
          } else if (error == null) {
            return typeof callback === "function" ? callback("Document does not exist") : void 0;
          } else {
            return typeof callback === "function" ? callback(error != null ? error.message : void 0) : void 0;
          }
        });
      } else {
        return typeof callback === "function" ? callback(error != null ? error.message : void 0) : void 0;
      }
    });
  };
  this.getSnapshot = function(docName, callback) {
    var sql, values;
    sql = "SELECT *\nFROM " + snapshot_table + "\nWHERE \"doc\" = $1\nORDER BY \"v\" DESC\nLIMIT 1";
    values = [docName];
    return client.query(sql, values, function(error, result) {
      var data, row;
      if ((error == null) && result.rows.length > 0) {
        row = result.rows[0];
        data = {
          v: row.v,
          snapshot: JSON.parse(row.snapshot),
          meta: JSON.parse(row.meta),
          type: row.type
        };
        return typeof callback === "function" ? callback(null, data) : void 0;
      } else if (error == null) {
        return typeof callback === "function" ? callback("Document does not exist") : void 0;
      } else {
        return typeof callback === "function" ? callback(error != null ? error.message : void 0) : void 0;
      }
    });
  };
  this.writeSnapshot = function(docName, docData, dbMeta, callback) {
    var sql, values;
    sql = "UPDATE " + snapshot_table + "\nSET \"v\" = $2, \"snapshot\" = $3, \"meta\" = $4\nWHERE \"doc\" = $1";
    values = [docName, docData.v, JSON.stringify(docData.snapshot), JSON.stringify(docData.meta)];
    return client.query(sql, values, function(error, result) {
      if (error == null) {
        return typeof callback === "function" ? callback() : void 0;
      } else {
        return typeof callback === "function" ? callback(error != null ? error.message : void 0) : void 0;
      }
    });
  };
  this.getOps = function(docName, start, end, callback) {
    var sql, values;
    end = end != null ? end - 1 : 2147483647;
    sql = "SELECT *\nFROM " + operations_table + "\nWHERE \"v\" BETWEEN $1 AND $2\nAND \"doc\" = $3\nORDER BY \"v\" ASC";
    values = [start, end, docName];
    return client.query(sql, values, function(error, result) {
      var data;
      if (error == null) {
        data = result.rows.map(function(row) {
          return {
            op: JSON.parse(row.op),
            meta: JSON.parse(row.meta)
          };
        });
        return typeof callback === "function" ? callback(null, data) : void 0;
      } else {
        return typeof callback === "function" ? callback(error != null ? error.message : void 0) : void 0;
      }
    });
  };
  this.writeOp = function(docName, opData, callback) {
    var sql, values;
    sql = "INSERT INTO " + operations_table + " (\"doc\", \"op\", \"v\", \"meta\")\n  VALUES ($1, $2, $3, $4)";
    values = [docName, JSON.stringify(opData.op), opData.v, JSON.stringify(opData.meta)];
    return client.query(sql, values, function(error, result) {
      if (error == null) {
        return typeof callback === "function" ? callback() : void 0;
      } else {
        return typeof callback === "function" ? callback(error != null ? error.message : void 0) : void 0;
      }
    });
  };
  if (options.create_tables_automatically) {
    client.query("SELECT * from " + snapshot_table + " LIMIT 0", function(error, result) {
      if (error != null ? error.message.match("does not exist") : void 0) {
        return _this.initialize();
      }
    });
  }
  return this;
};
