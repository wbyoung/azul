'use strict';

var _ = require('lodash');
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
    }).call('sort').map(function(name) {
      return { name: name };
    });
  },

  /**
   * Read the pending migration file names & return them in order.
   *
   * @return {Promise} A promise that resolves to an array of strings
   * representing the migration file names.
   */
  _readPendingMigrations: function() {
    var self = this;
    return BluebirdPromise.all([
      self._readMigrations(),
      self._readExecutedMigrations()
    ])
    .spread(function(migrations, executedMigrations) {
      var executed = _.groupBy(executedMigrations, 'name');
      var maxExecutedBatch = _.max(executedMigrations, 'batch').batch || 0;
      var batch = maxExecutedBatch + 1;
      return _(migrations).filter(function(migration) {
        return !executed[migration.name];
      })
      .map(function(migration) {
        return _.extend(migration, { batch: batch });
      })
      .sortBy('name')
      .value();
    });
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
    // TODO: could change the above query to order by name instead
    .call('sort', function(row1, row2) {
      return row1.name.localeCompare(row2.name);
    })
    .map(function(row) {
      return _.pick(row, 'name', 'batch');
    });
  },

  /**
   * Load the migration modules & return them in order.
   *
   * @return {Promise} A promise that resolves to an array of modules
   * representing the migrations.
   */
  _loadMigrations: function() {
    return this._readMigrations().bind(this).map(function(migration) {
      return _.extend(migration,
        require(path.join(this._dir, migration.name)));
    });
  },

  /**
   * Load the pending migration modules & return them in order.
   *
   * @return {Promise} A promise that resolves to an array of modules
   * representing the migrations.
   */
  _loadPendingMigrations: function() {
    return this._readPendingMigrations().bind(this).map(function(migration) {
      return _.extend(migration,
        require(path.join(this._dir, migration.name)));
    });
  },

  /**
   * Load the executed migration modules & return them in order.
   *
   * @return {Promise} A promise that resolves to an array of modules
   * representing the migrations.
   */
  _loadExecutedMigrations: function() {
    return this._readExecutedMigrations().bind(this).map(function(migration) {
      return _.extend(migration,
        require(path.join(this._dir, migration.name)));
    });
  },

  /**
   * Perform migrations.
   *
   * @return {Promise} A promise that will resolve when all migrations are
   * complete.
   */
  migrate: function() {
    // TODO: make this all happen in a transaction
    // var transaction = Transaction.create();
    // var schema = this._schema.transaction(transaction);
    // module.up(schema);
    return this._loadPendingMigrations().bind(this).each(function(module) {
      return module.up(this._schema);
    })
    .then(function(migrations) {
      var values = migrations.map(function(migration) {
        return _.pick(migration, 'name', 'batch');
      });
      return this._query.insert('azul_migrations').values(values);
    });
  },

  /**
   * Rollback migrations.
   *
   * @return {Promise} A promise that will resolve when all rollbacks are
   * complete.
   */
  rollback: function() {
    // TODO: make this all happen in a transaction
    return this._loadExecutedMigrations().bind(this).each(function(module) {
      return module.down(this._schema);
    })
    .then(function(migrations) {
      // TODO: delete from migrations table

    });
  }
});


module.exports = Migration.reopenClass({ __name__: 'Migration' });
