'use strict';

var _ = require('lodash');
var BluebirdPromise = require('bluebird');
var Class = require('../util/class');
var EntryQuery = require('./query/entry');
var Schema = require('./schema');
var Migration = require('./migration');

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
    this._super();

    if (!connection) { throw new Error('Missing connection information.'); }
    this._connection = connection;
    this._adapter = this._createAdapter(connection);
    this._schema = Schema.create(this._adapter);
    this._query = EntryQuery.create(this._adapter);
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
   * Get a new migrator to handle migrations at the given path.
   *
   * @param {String} migrationsPath The path to the directory containing
   * migrations.
   * @return {Migration} The migrator
   */
  migrator: function(migrationsPath) {
    return Migration.create(this._query, this._schema, migrationsPath);
  },

  _createAdapter: function(connection) {
    var adapter = connection.adapter;
    if (_.isString(connection.adapter)) {
      adapter = this._loadAdapterClass(connection.adapter)
        .create(_.omit(connection, 'adapter'));
    }
    return adapter;
  },

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
      var regex = /'\.\/adapters\/\w+'/;
      if (e.code === 'MODULE_NOT_FOUND' && e.message.match(regex)) {
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
 * @type {EntryQuery}
 * @readonly
 */
Database.defineAccessor('query');

/**
 * Access to a schema object that is tied to this database.
 *
 * @name Database#schema
 * @since 1.0
 * @public
 * @type {Schema}
 * @readonly
 */
Database.defineAccessor('schema');

Database.reopen(/** @lends Database# */ {

  /**
   * Shortcut for `db.query.select()`.
   *
   * @since 1.0
   * @public
   * @method
   * @see {@link Database#query}
   * @see {@link EntryQuery#select}
   */
  select: query('select'),

  /**
   * Shortcut for `db.query.insert()`.
   *
   * @since 1.0
   * @public
   * @method
   * @see {@link Database#query}
   * @see {@link EntryQuery#insert}
   */
  insert: query('insert'),

  /**
   * Shortcut for `db.query.delete()`.
   *
   * @since 1.0
   * @public
   * @method
   * @see {@link Database#query}
   * @see {@link EntryQuery#delete}
   */
  delete: query('delete')

});

module.exports = Database.reopenClass({ __name__: 'Database' });
