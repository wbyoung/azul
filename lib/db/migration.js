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
  init: function(adapter, schema, dir) {
    this._adapter = adapter;
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
   * Perform migrations.
   *
   * @return {Promise} A promise that will resolve when all migrations are
   * complete.
   */
  migrate: function() {
    return this._loadMigrations().bind(this).each(function(module) {
      module.up(this._schema);
    });
  }
});


module.exports = Migration.reopenClass({ __name__: 'Migration' });
