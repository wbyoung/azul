'use strict';

var _ = require('lodash');
var util = require('util');
var BluebirdPromise = require('bluebird');
var Adapter = require('./adapters/base');
var Class = require('../util/class');
var property = require('../util/property').fn;
var EntryQuery = require('./query/entry');
var Schema = require('./schema');
var Migration = require('./migration');
var Model = require('../model');

/**
 * Create a new database.
 *
 * @since 1.0
 * @public
 * @constructor Database
 * @param {Object} options The connection information.
 * @param {String} options.adapter The adapter to use. Possible choices are:
 * `pg`, `mysql`, or `sqlite3`.
 * @param {Object} options.connection The connection information to pass to the
 * adapter. This varies for each adapter. See each individual adapters for more
 * information.
 */
var Database = Class.extend(/** @lends Database# */{
  init: function(options) {
    this._super();

    if (!options) { throw new Error('Missing connection information.'); }
    this._adapter = this._createAdapter(options);
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

  _createAdapter: function(options) {
    var adapter = options.adapter;
    var connection = options.connection;
    if (_.isString(adapter)) {
      adapter = this._loadAdapterClass(adapter).create(connection);
    }
    if (!(adapter instanceof Adapter.__class__)) {
      throw new Error(util.format('Invalid adapter: %s', adapter));
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

Database.reopen(/** @lends Database# */ {
  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @type {Class}
   * @readonly
   */
  Model: property(function() {
    if (this._modelClass) { return this._modelClass; }

    this._modelClass = Model.extend({}, {
      adapter: this._adapter,
      query: this._query
    });

    return this._modelClass;
  })
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
Database.reopen({ query: property() });

/**
 * Access to a schema object that is tied to this database.
 *
 * @name Database#schema
 * @since 1.0
 * @public
 * @type {Schema}
 * @readonly
 */
Database.reopen({ schema: property() });

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
   * Shortcut for `db.query.update()`.
   *
   * @since 1.0
   * @public
   * @method
   * @see {@link Database#query}
   * @see {@link EntryQuery#update}
   */
  update: query('update'),

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
