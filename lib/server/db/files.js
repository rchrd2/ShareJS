// Generated by CoffeeScript 1.6.3
var fs;

fs = void 0;

fs = require('fs');

module.exports = function(options) {
  var DEBUG, isFunction, path;
  path = void 0;
  if (options === void 0) {
    options = {};
  }
  path = options.path || './sharejs-files';
  DEBUG = options.DEBUG;
  if (!fs.existsSync(path + '/files')) {
    fs.mkdirSync(path + '/files');
  }
  if (!fs.existsSync(path + '/ops')) {
    fs.mkdirSync(path + '/ops');
  }
  isFunction = function(x) {
    return Object.prototype.toString.call(x) === '[object Function]';
  };
  return {
    getOps: function(docName, start, end, callback) {
      if (DEBUG) {
        console.log("getOps " + docName);
      }
      fs.readFile(path + '/ops/' + docName + '.json', function(err, data) {
        var ops;
        if (err) {
          if (typeof callback === "function") {
            callback("Document does not exist");
          }
        }
        ops = [];
        try {
          data.toString().split(/\n/).forEach(function(line) {
            var row;
            try {
              row = JSON.parse(line);
              if (row.v >= start) {
                return ops.push(row);
              } else if (row.v < end) {
                return ops.push(row);
              }
            } catch (_error) {
              err = _error;
            }
          });
        } catch (_error) {
          err = _error;
        }
        if (typeof callback === "function") {
          callback(null, ops);
        }
      });
    },
    create: function(docName, data, callback) {
      if (DEBUG) {
        console.log("create " + docName);
      }
      if (fs.existsSync(path + '/files/' + docName + '.json')) {
        if (DEBUG) {
          console.log('already exists');
        }
        return console.log(callback);
      } else {
        if (DEBUG) {
          console.log('creating');
        }
        return fs.writeFile(path + '/files/' + docName + '.json', JSON.stringify(data), function(err) {
          if (DEBUG) {
            console.log('created' + path + '/files/' + docName + '.json');
          }
          if (err) {
            return typeof callback === "function" ? callback(err) : void 0;
          }
          return typeof callback === "function" ? callback() : void 0;
        });
      }
    },
    'delete': function(docName, dbMeta, callback) {
      if (DEBUG) {
        console.log("delete " + docName);
      }
      fs.unlink(path + '/ops/' + docName + '.json');
      fs.unlink(path + '/files/' + docName + '.json', function(err) {
        if (err) {
          if (typeof callback === "function") {
            callback("Document does not exist");
          }
        }
        if (typeof callback === "function") {
          callback();
        }
      });
    },
    writeOp: function(docName, opData, callback) {
      if (DEBUG) {
        console.log("writeOp " + docName);
      }
      fs.appendFile(path + '/ops/' + docName + '.json', JSON.stringify(opData) + "\n", function(err) {
        callback();
      });
    },
    writeSnapshot: function(docName, docData, dbMeta, callback) {
      if (DEBUG) {
        console.log("writeSnapshot " + docName);
      }
      fs.writeFile(path + '/files/' + docName + '.json', JSON.stringify(docData), function(err) {
        callback();
      });
    },
    getSnapshot: function(docName, callback) {
      if (DEBUG) {
        console.log("getSnapshot " + docName);
      }
      fs.readFile(path + '/files/' + docName + '.json', function(err, data) {
        var obj;
        if (err) {
          callback("Document does not exist");
        }
        try {
          obj = JSON.parse(data.toString());
          callback(null, obj);
        } catch (_error) {
          err = _error;
          callback("Document does not exist");
        }
      });
    },
    close: function() {}
  };
};
