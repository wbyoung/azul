'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var adapter = require('maguey').adapter;
var Class = require('corazon/class');
var property = require('corazon/property');
var EntryQuery = require('maguey').EntryQuery;
var Migration = require('./migration');
var Model = require('./model');

/**
 * @class Database
 */
var Database = Class.extend(/** @lends Database# */ {

  /**
   * Create a database.
   *
   * @public
   * @constructor Database
   * @param {Object} options The connection information.
   * @param {String} options.adapter The adapter to use. Possible choices are:
   * `pg`, `mysql`, or `sqlite3`.
   * @param {Object} options.connection The connection information to pass to
   * the adapter. This varies for each adapter. See each individual adapters
   * for more information.
   */
  init: function(options) {
    this._super();

    this._adapter = adapter(options);
    this._query = EntryQuery.create(this._adapter);
    this._schema = this._query.schema();
    this._modelClasses = {};
  },

  /**
   * Disconnect a database.
   *
   * @return {Promise} A promise indicating that the database has been
   * disconnected.
   */
  disconnect: Promise.method(function() {
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
    return Migration.create(this._query, migrationsPath);
  },

});

Database.reopen(/** @lends Database# */ {

  /**
   * The base model class for this database.
   *
   * While accessible, subclassing this class directly is strongly discouraged
   * and may no be supported in the future. Instead use {@link Database.model}.
   *
   * @public
   * @type {Class}
   * @readonly
   */
  Model: property(function() {
    if (this._modelClass) { return this._modelClass; }

    this._modelClass = Model.extend({}, {
      db: this,
      adapter: this._adapter,
      query: this._query,
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
   * @param {Object} [properties] Properties to add to the class
   * @return {Class} The model class
   */
  model: function(name, properties) {
    var className = _.capitalize(_.camelCase(name));
    var known = this._modelClasses;
    var model = known[className];
    if (!model) {
      model = known[className] =
        this.Model.extend({}, { __name__: className });
    }
    return model.reopen(properties);
  },

  // convenience methods (documentation at original definitions)
  attr: Model.attr,
  hasMany: Model.hasMany,
  hasOne: Model.hasOne,
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
 * @public
 * @type {EntryQuery}
 * @readonly
 */
Database.reopen({ query: property() });

/**
 * Access to a schema object that is tied to this database.
 *
 * @name Database#schema
 * @public
 * @type {Schema}
 * @readonly
 */
Database.reopen({ schema: property() });

Database.reopen(/** @lends Database# */ {

  /**
   * Shortcut for `db.query.select()`.
   *
   * @method
   * @public
   * @see {@link Database#query}
   * @see {@link EntryQuery#select}
   */
  select: query('select'),

  /**
   * Shortcut for `db.query.insert()`.
   *
   * @method
   * @public
   * @see {@link Database#query}
   * @see {@link EntryQuery#insert}
   */
  insert: query('insert'),

  /**
   * Shortcut for `db.query.update()`.
   *
   * @method
   * @public
   * @see {@link Database#query}
   * @see {@link EntryQuery#update}
   */
  update: query('update'),

  /**
   * Shortcut for `db.query.delete()`.
   *
   * @method
   * @public
   * @see {@link Database#query}
   * @see {@link EntryQuery#delete}
   */
  delete: query('delete'),

  /**
   * Shortcut for `db.query.transaction()`.
   *
   * @method
   * @public
   * @see {@link Database#query}
   * @see {@link EntryQuery#transaction}
   */
  transaction: query('transaction'),

});

module.exports = Database.reopenClass({ __name__: 'Database' });
