'use strict';

var _ = require('lodash');
var util = require('util');
var BluebirdPromise = require('bluebird');
var Adapter = require('./adapters/base');
var Class = require('./util/class');
var property = require('./util/property').fn;
var EntryQuery = require('./query/entry');
var Schema = require('./schema');
var Migration = require('./migration');
var Model = require('./model');

_.str = require('underscore.string');

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
    this._modelClasses = {};
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
   * The base model class for this database.
   *
   * While accessible, subclassing this class directly is strongly discouraged
   * and may no be supported in the future. Instead use {@link Database.model}.
   *
   * @since 1.0
   * @public
   * @type {Class}
   * @readonly
   */
  Model: property(function() {
    if (this._modelClass) { return this._modelClass; }

    this._modelClass = Model.extend({}, {
      db: this,
      adapter: this._adapter,
      query: this._query
    });

    return this._modelClass;
  }),

  /**
   * Create a new model class or retrieve an existing class.
   *
   * This is the preferred way of creating new model classes as it also stores
   * the model class by name, allowing you to use strings in certain places to
   * refer to classes (i.e. when defining relationships).
   *
   * @param {String} name The name for the class
   * @return {Class} The model class
   */
  model: function(name) {
    var className = _.str.classify(name);
    var known = this._modelClasses;
    if (!known[className]) {
      known[className] = this.Model.extend({}, { __name__: className });
    }
    return known[className];
  },

  // convenience methods (documentation at original definitions)
  attr: Model.attr,
  hasMany: Model.hasMany,
  belongsTo: Model.belongsTo,
});

/**
 * A convenience method for tapping into a named query method. This is
 * basically a curry that allows quick definition on the database of various
 * query convenience methods, for instance:
 *
 *     Database.reopen({ select: query('select') })
 *     db.select('users') // -> db.query.select('users')
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
