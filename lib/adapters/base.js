'use strict';

var _ = require('lodash');
var pool = require('generic-pool');
var Promise = require('bluebird');
var Class = require('corazon/class');
var property = require('corazon/property');
var Grammar = require('../dialect/grammar');
var Translator = require('../dialect/translator');
var Phrasing = require('../dialect/phrasing');
var Procedures = require('../dialect/procedures');

/**
 * The base Adapter class is the extension point for custom database adapters.
 * As a user of Azul, you typically won't use this, but if you're looking to
 * add support for a custom database, you should start here.
 *
 * @public
 * @constructor
 */
var Adapter = Class.extend(/** @lends Adapter# */ {
  init: function(connection) {
    this._super();
    this._connection = connection;
    this._grammar = this.__identity__.Grammar.create();
    this._translator = this.__identity__.Translator.create();
    this._phrasing = this.__identity__.Phrasing.create(this._grammar, this._translator);
    this._procedures = this.__identity__.Procedures.create(this._grammar, this._phrasing);
  }
});

Adapter.reopenClass(/** @lends Adapter */ {

  /**
   * The grammar class to use for this adapter. Subclasses can override this
   * property to customize the grammar in use.
   *
   * @public
   * @type {Grammar}
   */
  Grammar: Grammar,

  /**
   * The translator class to use for this adapter. Subclasses can override this
   * property to customize the translator in use.
   *
   * @public
   * @type {Translator}
   */
  Translator: Translator,

  /**
   * The phrasing class to use for this adapter. Subclasses can override this
   * property to customize the phrasing in use.
   *
   * @public
   * @type {Phrasing}
   */
  Phrasing: Phrasing,


  /**
   * The procedures class to use for this adapter. Subclasses can override this
   * property to customize the procedures in use.
   *
   * @public
   * @type {Procedures}
   */
  Procedures: Procedures,

});

/**
 * Access to the {@link Translator} instance.
 *
 * @name Adapter#translator
 * @public
 * @type {Translator}
 * @readonly
 */
Adapter.reopen({ translator: property() });

/**
 * Access to the {@link Phrasing} instance.
 *
 * @name Adapter#phrasing
 * @public
 * @type {Phrasing}
 * @readonly
 */
Adapter.reopen({ phrasing: property() });

/**
 * Access to the {@link Procedures} instance.
 *
 * @name Adapter#phrasing
 * @public
 * @type {Procedures}
 * @readonly
 */
Adapter.reopen({ procedures: property() });

Adapter.reopen(/** @lends Adapter# */ {

  /**
   * Create a connection.
   *
   * The resulting _client_ object can be any object. It will be created
   * through  a resource pool to avoid creating too many connections. The
   * _client_ object will also be passed to {@link #_disconnect} and
   * {@link #_execute} for subclass use.
   *
   * Subclasses must implement this method.
   *
   * @protected
   * @return {Promise} Promise to resolve with a _client_ object when the
   * connection has been established.
   */
  _connect: Promise.method(function() {
    throw new Error('The `_connect` method must be implemented by subclass');
  }),

  /**
   * Destroy a connection.
   *
   * The `client` object is the object that was created from a
   * {@link #_connect}.
   *
   * Subclasses must implement this method.
   *
   * @protected
   * @param {Object} client The _client_ object.
   * @return {Promise} Promise to resolve when connection has been closed.
   */
  _disconnect: Promise.method(function(/*client*/) {
    throw new Error('The `_disconnect` method must be implemented by subclass');
  }),

  /**
   * The format for normalized responses after executing a raw SQL query in a
   * database.
   *
   * @public
   * @typedef {Object} Adapter~ExecutionResult
   * @property {Array.<Object>} client The client that executed the query.
   * @property {Array.<Object>} rows The rows returned by the query.
   * @property {Array.<String>} fields The filed names returned by the query
   * (in order).
   */

  /**
   * Execute a query.
   *
   * @param {String} sql The raw sql string.
   * @param {Array} args The positional sql args.
   * @param {Object} [options] Options.
   * @package {Object} [options.client] Client to use rather than acquiring one.
   * @return {Promise} A promise that will resolve/reject to an
   * {@link Adapter~ExecutionResult}.
   */
  execute: Promise.method(function(sql, args, options) {
    var self = this;
    var opts = options || {};
    return Promise.bind({}).then(function() {
      return opts.client ||
        (this.acquired = true, self.pool.acquireAsync());
    })
    .then(function(client) { this.client = client; })
    .then(function() {
      return self._execute(this.client, sql, args);
    })
    .finally(function() {
      return this.acquired && self.pool.release(this.client);
    });
  }),

  /**
   * Execute a query.
   *
   * The resolved result should be normalized by the subclass to contain the
   * properties defined by {@link Adapter~ExecutionResult}.
   *
   * The `client` object is the object that was created from a
   * {@link #_connect}.
   *
   * Subclasses must implement this method.
   *
   * @param {Object} client The _client_ object.
   * @param {String} sql The raw sql string.
   * @param {Array} args The positional sql args.
   * @return {Promise} A promise that will resolve/reject based on the results
   * of the query.
   */
  _execute: Promise.method(function(/*client, sql, args*/) {
    throw new Error('The `_execute` method must be implemented by subclass');
  }),

  /**
   * Disconnect all connections.
   *
   * @return {Promise} A promise indicating that the database has been
   * disconnected.
   */
  disconnectAll: Promise.method(function() {
    return new Promise(function(resolve) {
      this.pool.drain(function() {
        this.pool.destroyAllNow();
        resolve();
      }.bind(this));
    }.bind(this));
  }),

  /**
   * Access to pool that manages creation/destruction of connection and keeps
   * track of objects representing details of those connections. The details
   * objects may vary by adapter.
   *
   * @name Adapter#pool
   * @private
   * @type {Object}
   * @readonly
   */
  pool: property(function() {
    if (this._pool) { return this._pool; }

    var self = this;
    var create = function(callback) {
      // an arbitrary value, usually a _client_, (and will be referred to as
      // _client_ throughout this code) will be passed through from the result of
      // the adapter's `_connect` to the success function. this will result in
      // the pool resource vending that _client_ when new acquisitions are made.
      var success = _.partial(callback, null);
      var failure = callback;
      self._connect().then(success, failure);
    };

    var destroy = function(client) {
      // it is expected that when resources are released from the pool the
      // `release` call will be provided with the _client_, the same object that
      // was returned from the `_connect` method. so here, it gets passed along
      // to `_disconnect` so the `_disconnect` gets the same _client_ object that
      // `_connect` returned.
      self._disconnect(client);
    };

    self._pool = Promise.promisifyAll(pool.Pool({
      name: 'connection',
      create: create,
      destroy: destroy,
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000
    }));

    return self._pool;
  })
});

module.exports = Adapter.reopenClass({ __name__: 'Adapter' });
