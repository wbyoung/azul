'use strict';

var _ = require('lodash');
var BluebirdPromise = require('bluebird');
var Class = require('../util/class');
var Query = require('./query');
var pool = require('generic-pool');

/**
 * @since 1.0
 * @public
 * @constructor
 */
var Database = Class.extend(/** @lends Database# */{

  /**
   * Create a new database.
   *
   * @alias Database
   * @param {Object} connection The connection information.
   * @param {String} connection.adapter The adapter to use. Possible choices
   * are:
   *   - pg
   *   - mysql
   *   - sqlite
   * @param {String} connection.database The database to connect to.
   * @param {String} connection.username The username to connect with.
   * @param {String} connection.password The password to connect with.
   */
  init: function(connection) {
    if (!connection) { throw new Error('Missing connection information.'); }

    var Adapter;
    if (connection.adapter && typeof connection.adapter.__class__ === 'function') {
      Adapter = connection.adapter;
    }
    if (!Adapter) {
      try { Adapter = require('./adapters/' + connection.adapter); }
      catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
          throw new Error('No adapter found for ' + connection.adapter);
        }
        else { throw e; }
      }
    }
    this._connection = connection;
    this._adapter = Adapter.create();
    this._query = Query.create(this._adapter);
  },

  /**
   * Disconnect a database.
   *
   * @return {Promise} A promise indicating that the database has been
   * disconnected.
   */
  disconnect: BluebirdPromise.method(function() {
    return new BluebirdPromise(function(resolve, reject) {
      this.pool.drain(function() {
        this.pool.destroyAllNow();
        resolve();
      }.bind(this));
    }.bind(this));
  }),

  /**
   * Create connection details via the adapter. This is triggered by the
   * database connection pool needing to create another resource.
   *
   * @private
   * @param {Function} callback The callback to call to notify the connection
   * pool that the resource has been created.
   */
  _poolCreateConnection: function(callback) {
    // details will be passed through from the adapter's connect promise
    // to the success function. this will result in the pool resource knowing
    // the details that the adapter sent.
    var success = _.partial(callback, null);
    var failure = callback
    this._adapter.connect(this.connection).then(success, callback);
  },

  /**
   * Destroy connection details via the adapter. This is triggered by the
   * database connection pool destroying a resource either because it is idle
   * or because it's being destroyed while disconnecting this database
   * instance.
   *
   * @private
   * @param {Object} details The details that the adapter originally returned
   * during connection.
   */
  _poolDestroyConnection: function(details) {
    this._adapter.disconnect(details);
  }

});

/**
 * Access to pool that manages creation/destruction of connection and keeps
 * track of objects representing details of those connections. The details
 * objects may vary by adapter.
 *
 * @name Database#pool
 * @private
 * @type {Object}
 * @readonly
 */
Database.defineAccessor('pool', function() {
  return this._pool = this._pool || pool.Pool({
    name: 'connection',
    create: this._poolCreateConnection.bind(this),
    destroy: this._poolDestroyConnection.bind(this),
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000
  });
});

/**
 * Documentation forthcoming.
 *
 * @private
 * @function Database~query
 */
var query = function(name) {
  return function() {
    return this._query[name].apply(this._query, arguments);
  };
};

/**
 * Access to a query object that is tied to this database.
 *
 * @name Database#query
 * @since 1.0
 * @public
 * @type {Query}
 * @readonly
 */
Database.defineAccessor('query');

Database.reopen(/** @lends Database# */ {

  /**
   * Shortcut for `db.query.select()`.
   *
   * @since 1.0
   * @public
   * @method
   * @see {@link Database#query}
   * @see {@link Query#select}
   */
  select: query('select')

});

module.exports = Database.reopenClass({ __name__: 'Database' });
