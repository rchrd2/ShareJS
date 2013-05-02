// A Connection wraps a persistant BC connection to a sharejs server.
//
// This class implements the client side of the protocol defined here:
// https://github.com/josephg/ShareJS/wiki/Wire-Protocol
//
// The equivalent server code is in src/server/session.
//
// This file is a bit of a mess. I'm dreadfully sorry about that. It passes all the tests,
// so I have hope that its *correct* even if its not clean.
//
// To make a connection, use:
//  new sharejs.Connection(socket)
//
// The socket should look like a websocket connection. It should have the following properties:
//  send(msg): Send the given message. msg may be an object - if so, you might need to JSON.stringify it.
//  close(): Disconnect the session
//
//  onmessage = function(msg){}: Event handler which is called whenever a message is received. The message
//     passed in should already be an object. (It may need to be JSON.parsed)
//  onclose
//  onerror
//  onopen
//  onconnecting
//
// The socket should probably automatically reconnect. If so, it should emit the appropriate events as it
// disconnects & reconnects. (onclose(), onconnecting(), onopen()).

var types, Doc;
if (typeof require !== 'undefined') {
  types = require('ot-types');
  Doc = require('./doc').Doc;
  Query = require('./query').Query;
} else {
  types = window.ottypes;
  Doc = exports.Doc;
}

var Connection = exports.Connection = function (socket) {
  this.socket = socket;

  // Map of collection -> docName -> doc object for created documents.
  // (created documents MUST BE UNIQUE)
  this.collections = {};

  // Each query is created with an id that the server uses when it sends us
  // info about the query (updates, etc).
  this.nextQueryId = 1;
  // Map from query ID -> query object.
  this.queries = {};

  // Connection state.
  // 
  // States:
  // - 'connecting': The connection has been established, but we don't have our client ID yet
  // - 'connected': We have connected and recieved our client ID. Ready for data.
  // - 'disconnected': The connection is closed, but it will reconnect automatically.
  // - 'stopped': The connection is closed, and should not reconnect.
  this.state = 'disconnected';

  // This is a helper variable the document uses to see whether we're currently
  // in a 'live' state. It is true if the state is 'connecting' or 'connected'.
  this.canSend = false;

  // Reset some more state variables.
  this.reset();


  var _this = this;

  // Attach event handlers to the socket.
  socket.onmessage = function(msg) {
    console.log('RECV', JSON.stringify(msg));

    // Switch on the message action. Most messages are for documents and are
    // handled in the doc class.
    switch (msg.a) {
      case 'init':
        // Client initialization packet. This bundle of joy contains our client
        // ID.
        if (msg.protocol !== 0) throw new Error('Invalid protocol version');
        if (typeof msg.id != 'string') throw new Error('Invalid client id');

        _this.id = msg.id;
        _this._setState('connected');
        break;

      case 'qsub':
      case 'q':
      case 'qunsub':
        // Query message. Pass this to the appropriate query object.
        _this.queries[msg.id]._onMessage(msg);
        break;

      default:
        // Document message. Pull out the referenced document and forward the
        // message.
        var collection, docName, doc;
        if (msg.doc) {
          collection = this._lastReceivedCollection = msg.c;
          docName = this._lastReceivedDoc = msg.doc;
        } else {
          collection = msg.c = this._lastReceivedCollection;
          docName = msg.doc = this._lastReceivedDoc;
        }

        doc = _this.get(collection, docName);
        if (!doc) {
          if (console) console.error('Message for unknown doc. Ignoring.', msg);
          break;
        }
        doc._onMessage(msg);
    }
  };

  socket.onopen = function() {
    _this._setState('connecting');
  };

  socket.onerror = function(e) {
    _this.emit('error', e);
  };

  socket.onclose = function(reason) {
    _this._setState('disconnected', reason);
    if (reason === 'Closed' || reason === 'Stopped by server') {
      _this._setState('stopped', reason);
    }
  };
}

/* Why does this function exist? Is it important?
Connection.prototype._error = function(e) {
  this._setState('stopped', e);
  return this.disconnect(e);
};
*/

Connection.prototype.reset = function() {
  this.id = this.lastError =
    this._lastReceivedCollection = this._lastReceivedDoc =
    this._lastSentCollection = this._lastSentDoc = null;

  this.seq = 1;
};

// Set the connection's state. The connection is basically a state machine.
Connection.prototype._setState = function(newState, data) {
  if (this.state === newState) return;

  // I made a state diagram. The only invalid transitions are getting to
  // 'connecting' from anywhere other than 'disconnected' and getting to
  // 'connected' from anywhere other than 'connecting'.
  if ((newState === 'connecting' && this.state !== 'disconnected')
      || (newState === 'connected' && this.state !== 'connecting')) {
    throw new Error("Cannot transition directly from " + this.state + " to " + newState);
  }

  this.state = newState;
  this.canSend = newState === 'connecting' || newState === 'connected';

  if (newState === 'disconnected') this.reset();

  this.emit(newState, data);

  // & Emit the event to all documents & queries. It might make sense for
  // documents to just register for this stuff using events, but that couples
  // connections and documents a bit much. Its not a big deal either way.
  for (c in this.collections) {
    var collection = this.collections[c];
    for (docName in collection) {
      collection[docName]._onConnectionStateChanged(newState, data);
    }
  }
  for (c in this.queries) {
    this.queries[c]._onConnectionStateChanged(newState, data);
  }
};

// Send a message to the connection.
Connection.prototype.send = function(data) {
  console.log("SEND:", JSON.stringify(data));

  if (data.doc) { // Not set for queries.
    var docName = data.doc;
    var collection = data.c;
    if (collection === this._lastSentCollection && docName === this._lastSentDoc) {
      delete data.c;
      delete data.doc;
    } else {
      this._lastSentCollection = collection;
      this._lastSentDoc = docName;
    }
  }

  this.socket.send(data);
};

Connection.prototype.disconnect = function() {
  // This will call @socket.onclose(), which in turn will emit the 'disconnected' event.
  this.socket.close();
};


// ***** Document management

Connection.prototype.get = function(collection, name) {
  if (this.collections[collection]) return this.collections[collection][name];
};

// Create a document if it doesn't exist. Returns the document synchronously.
Connection.prototype.getOrCreate = function(collection, name, data) {
  var doc = this.get(collection, name);
  if (doc) return doc;

  // Create it.
  doc = new Doc(this, collection, name, data);

  collection = this.collections[collection] = (this.collections[collection] || {});
  return collection[name] = doc;
};


// **** Queries.

/**
 *
 * @optional source
 */
Connection.prototype.createQuery = function(collection, q, source) {
  var id = this.nextQueryId++;
  var query = new Query(this, id, collection, q);
  this.queries[id] = query;
  return query;
};

Connection.prototype.destroyQuery = function(query) {
  delete this.queries[query.id];
};

if (typeof require !== 'undefined') {
  MicroEvent = require('./microevent');
}

MicroEvent.mixin(Connection);

