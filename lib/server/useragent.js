// Generated by CoffeeScript 1.6.3
var hat, types;

hat = require('hat');

types = require('../types');

module.exports = function(model, options) {
  var UserAgent, auth;
  auth = options.auth || function(agent, action) {
    var _ref;
    if ((_ref = action.type) === 'connect' || _ref === 'read' || _ref === 'create' || _ref === 'update') {
      return action.accept();
    } else {
      return action.reject();
    }
  };
  UserAgent = (function() {
    function UserAgent(data) {
      this.sessionId = hat();
      this.connectTime = new Date;
      this.headers = data.headers;
      this.remoteAddress = data.remoteAddress;
      this.authentication = data.authentication;
      this.listeners = {};
      this.name = null;
    }

    UserAgent.prototype.doAuth = function(actionData, name, userCallback, acceptCallback) {
      var action;
      action = actionData || {};
      action.name = name;
      action.type = (function() {
        switch (name) {
          case 'connect':
            return 'connect';
          case 'create':
            return 'create';
          case 'get snapshot':
          case 'get ops':
          case 'open':
            return 'read';
          case 'submit op':
            return 'update';
          case 'submit meta':
            return 'update';
          case 'delete':
            return 'delete';
          default:
            throw new Error("Invalid action name " + name);
        }
      })();
      action.responded = false;
      action.reject = function(message) {
        if (message == null) {
          message = 'forbidden';
        }
        if (this.responded) {
          throw new Error('Multiple accept/reject calls made');
        }
        this.responded = true;
        return userCallback(message, null);
      };
      action.accept = function() {
        if (this.responded) {
          throw new Error('Multiple accept/reject calls made');
        }
        this.responded = true;
        return acceptCallback();
      };
      return auth(this, action);
    };

    UserAgent.prototype.disconnect = function() {
      var docName, listener, _ref, _results;
      _ref = this.listeners;
      _results = [];
      for (docName in _ref) {
        listener = _ref[docName];
        _results.push(model.removeListener(docName, listener));
      }
      return _results;
    };

    UserAgent.prototype.getOps = function(docName, start, end, callback) {
      return this.doAuth({
        docName: docName,
        start: start,
        end: end
      }, 'get ops', callback, function() {
        return model.getOps(docName, start, end, callback);
      });
    };

    UserAgent.prototype.getSnapshot = function(docName, callback) {
      return this.doAuth({
        docName: docName
      }, 'get snapshot', callback, function() {
        return model.getSnapshot(docName, callback);
      });
    };

    UserAgent.prototype.create = function(docName, type, meta, callback) {
      var _this = this;
      if (typeof type === 'string') {
        type = types[type];
      }
      meta = {};
      if (this.name) {
        meta.creator = this.name;
      }
      meta.ctime = meta.mtime = Date.now();
      return this.doAuth({
        docName: docName,
        docType: type,
        meta: meta
      }, 'create', callback, function() {
        return model.create(docName, type, meta, callback);
      });
    };

    UserAgent.prototype.submitOp = function(docName, opData, callback) {
      var dupIfSource,
        _this = this;
      opData.meta || (opData.meta = {});
      opData.meta.source = this.sessionId;
      dupIfSource = opData.dupIfSource || [];
      if (opData.op) {
        return this.doAuth({
          docName: docName,
          op: opData.op,
          v: opData.v,
          meta: opData.meta,
          dupIfSource: dupIfSource
        }, 'submit op', callback, function() {
          return model.applyOp(docName, opData, callback);
        });
      } else {
        return this.doAuth({
          docName: docName,
          meta: opData.meta
        }, 'submit meta', callback, function() {
          return model.applyMetaOp(docName, opData, callback);
        });
      }
    };

    UserAgent.prototype["delete"] = function(docName, callback) {
      var _this = this;
      return this.doAuth({
        docName: docName
      }, 'delete', callback, function() {
        return model["delete"](docName, callback);
      });
    };

    UserAgent.prototype.listen = function(docName, version, listener, callback) {
      var authOps,
        _this = this;
      authOps = version != null ? function(c) {
        return _this.doAuth({
          docName: docName,
          start: version,
          end: null
        }, 'get ops', callback, c);
      } : function(c) {
        return c();
      };
      return authOps(function() {
        return _this.doAuth({
          docName: docName,
          v: version != null ? version : void 0
        }, 'open', callback, function() {
          if (_this.listeners[docName]) {
            return typeof callback === "function" ? callback('Document is already open') : void 0;
          }
          _this.listeners[docName] = listener;
          return model.listen(docName, version, listener, function(error, v) {
            if (error) {
              delete _this.listeners[docName];
            }
            return typeof callback === "function" ? callback(error, v) : void 0;
          });
        });
      });
    };

    UserAgent.prototype.removeListener = function(docName) {
      if (!this.listeners[docName]) {
        return;
      }
      model.removeListener(docName, this.listeners[docName]);
      return delete this.listeners[docName];
    };

    return UserAgent;

  })();
  return function(data, callback) {
    var agent;
    agent = new UserAgent(data);
    return agent.doAuth(null, 'connect', callback, function() {
      return callback(null, agent);
    });
  };
};
