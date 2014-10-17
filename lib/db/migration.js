'use strict';

var Class = require('../util/class');
var BluebirdPromise = require('bluebird');
var path = require('path');
var fs = BluebirdPromise.promisifyAll(require('fs'));

/**
 * Migrations allow you to define a sequence for moving your schema forward and
 * backward with simple abstractions in JavaScript.
 *
 * @since 1.0
 * @protected
 * @constructor
 * @param {Adapter} adapter The adapter to use when using the query.
 * @param {Schema} schema The schema object that will be used for migrations.
 * @param {String} dir The directory containing the migration files.
 */
var Migration = Class.extend(/** @lends Migration# */{
  init: function(query, schema, dir) {
    this._super();
    this._query = query;
    this._schema = schema;
    this._dir = dir;
  },

  /**
   * Read the migration file names & return them in order.
   *
   * @return {Promise} A promise that resolves to an array of strings
   * representing the migration file names.
   */
  _readMigrations: function() {
    return fs.readdirAsync(this._dir).map(function(file) {
      return path.basename(file, '.js');
    }).call('sort');
  },

  /**
   * Read the executed migration file names & return them in order.
   *
   * @return {Promise} A promise that resolves to an array of strings
   * representing the migration file names.
   */
  _readExecutedMigrations: function() {
    return BluebirdPromise.bind(this).then(function() {
      return this._schema.createTable('azul_migrations', function(table) {
        table.serial('id');
        table.string('name');
        table.integer('batch');
      }).unlessExists();
    })
    .then(function() {
      return this._query.select('azul_migrations', ['id', 'name', 'batch']);
    })
    .get('rows')
    .map(function(row) { return row.name; })
    .call('sort');
  },

  /**
   * Load the migration modules & return them in order.
   *
   * @return {Promise} A promise that resolves to an array of modules
   * representing the migrations.
   */
  _loadMigrations: function() {
    return this._readMigrations().bind(this).map(function(file) {
      return require(path.join(this._dir, file));
    });
  },

  /**
   * Load the executed migration modules & return them in order.
   *
   * @return {Promise} A promise that resolves to an array of modules
   * representing the migrations.
   */
  _loadExecutedMigrations: function() {
    return this._readExecutedMigrations().bind(this).map(function(file) {
      return require(path.join(this._dir, file));
    });
  },

  /**
   * Perform migrations.
   *
   * @return {Promise} A promise that will resolve when all migrations are
   * complete.
   */
  migrate: function() {
    // TODO: apply only un-applied migrations
    return this._loadMigrations().bind(this).each(function(module) {
      return module.up(this._schema);
    });
  },

  /**
   * Rollback migrations.
   *
   * @return {Promise} A promise that will resolve when all rollbacks are
   * complete.
   */
  rollback: function() {
    // TODO: only rollback one migration (or group)
    return this._loadMigrations().bind(this).each(function(module) {
      return module.down(this._schema);
    });
  }
});


module.exports = Migration.reopenClass({ __name__: 'Migration' });
