'use strict';

var _ = require('lodash');
var BluebirdPromise = require('bluebird');
var Class = require('../util/class');
var Query = require('./query');

/**
 * Create a new database.
 *
 * @since 1.0
 * @public
 * @constructor Database
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
var Database = Class.extend(/** @lends Database# */{
  init: function(connection) {
    if (!connection) { throw new Error('Missing connection information.'); }
    this._connection = connection;
    this._adapter = _.isString(connection.adapter) ?
      this._loadAdapterClass(connection.adapter).create(connection) :
      connection.adapter;
    this._query = Query.create(this._adapter);
  },

  /**
   * Disconnect a database.
   *
   * @return {Promise} A promise indicating that the database has been
   * disconnected.
   */
  disconnect: BluebirdPromise.method(function() {
    return this._adapter.disconnectAll();
  }),

  /**
   * Load an adapter class from an adapter name.
   *
   * @private
   * @param {String} name The name of the Adapter to load
   * @return {Class} The adapter class.
   */
  _loadAdapterClass: function(name) {
    var Adapter;
    try { Adapter = require('./adapters/' + name); }
    catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        throw new Error('No adapter found for ' + name);
      }
      else { throw e; }
    }
    return Adapter;
  }

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
