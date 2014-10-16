'use strict';

var _ = require('lodash');
var pool = require('generic-pool');
var BluebirdPromise = require('bluebird');
var Class = require('../../util/class');
var Grammar = require('../grammar');
var Translator = require('../grammar/translator');
var Phrasing = require('../grammar/phrasing');

/**
 * The base Adapter class is the extension point for custom database adapters.
 * As a user of Azul, you typically won't use this, but if you're looking to
 * add support for a custom database, you should start here.
 *
 * @since 1.0
 * @public
 * @constructor
 */
var Adapter = Class.extend(/** @lends Adapter# */ {
  init: function(connection) {
    this._connection = connection;
    this._grammar = this.__identity__.Grammar.create();
    this._translator = this.__identity__.Translator.create();
    this._phrasing = this.__identity__.Phrasing.create(this._grammar, this._translator);
  }
});

Adapter.reopenClass(/** @lends Adapter */ {

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @type {Grammar}
   */
  Grammar: Grammar,

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @type {Translator}
   */
  Translator: Translator,

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @type {Phrasing}
   */
  Phrasing: Phrasing

});

/**
 * Access to the {@link Translator} instance.
 *
 * @name Adapter#translator
 * @since 1.0
 * @public
 * @type {Translator}
 * @readonly
 */
Adapter.defineAccessor('translator');

/**
 * Access to the {@link Phrasing} instance.
 *
 * @name Adapter#phrasing
 * @since 1.0
 * @public
 * @type {Phrasing}
 * @readonly
 */
Adapter.defineAccessor('phrasing');

Adapter.reopen(/** @lends Adapter# */ {

  /**
   * Create a connection.
   *
   * @todo refine the ideas here so that it will support pooling and all possible
   * databases.
   * @since 1.0
   * @protected
   * @return {Promise} Promise to resolve when connection has been established.
   * @see {@link Database}
   */
  _connect: BluebirdPromise.method(function() {
    throw new Error('The `_connect` method must be implemented by subclass');
  }),

  /**
   * Destroy a connection.
   *
   * @todo refine the ideas here so that it will support pooling and all possible
   * databases.
   * @since 1.0
   * @protected
   * @param {Object} connection The connection object.
   * @return {Promise} Promise to resolve when connection has been closed.
   * @see {@link Database}
   */
  _disconnect: BluebirdPromise.method(function(/*details*/) {
    throw new Error('The `_disconnect` method must be implemented by subclass');
  }),

  /**
   * The format for normalized responses after executing a raw SQL query in a
   * database.
   *
   * @since 1.0
   * @public
   * @typedef {Object} Adapter~ExecutionResult
   * @property {Array.<Object>} rows The rows returned by the query.
   * @property {Array.<String>} fields The filed names returned by the query
   * (in order).
   * @property {String} command The command that was executed.
   */

  /**
   * Execute a query.
   *
   * The resolved result object should be normalized by the adapter to contain
   * the properties defined by {@link-to Adapter~ExecutionResult}.
   *
   * @todo refine the ideas here so that it will support streaming responses
   * and accepting existing connections.
   *
   * @param {String} sql The raw sql string.
   * @param {Array} args The positional sql args.
   * @return {Promise} A promise that will resolve/reject based on the results
   * of the query.
   */
  execute: BluebirdPromise.method(function(/*sql, args*/) {
    throw new Error('The `execute` method must be implemented by subclass');
  }),

  /**
   * Disconnect all connections.
   *
   * @return {Promise} A promise indicating that the database has been
   * disconnected.
   */
  disconnectAll: BluebirdPromise.method(function() {
    return new BluebirdPromise(function(resolve) {
      this.pool.drain(function() {
        this.pool.destroyAllNow();
        resolve();
      }.bind(this));
    }.bind(this));
  })

});

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
Adapter.defineAccessor('pool', function() {
  var self = this;
  var create = function(callback) {
    // an arbitrary value will be passed through from the result of the
    // adapter's `_connect` to the success function. this will result in the
    // pool resource vending that object when new acquisitions are made.
    var success = _.partial(callback, null);
    var failure = callback;
    self._connect().then(success, failure);
  };

  var destroy = function(obj) {
    // it is expected that when resources are released from the pool the
    // `release` call will be provided with the same object that was returned
    // from the `_connect` method. so here, it gets passed along to
    // `_disconnect` so the `_disconnect` gets the same object that `_connect`
    // returned.
    self._disconnect(obj);
  };

  return (self._pool = self._pool || BluebirdPromise.promisifyAll(pool.Pool({
    name: 'connection',
    create: create,
    destroy: destroy,
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000
  })));
});

module.exports = Adapter.reopenClass({ __name__: 'Adapter' });
