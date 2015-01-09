'use strict';

var _ = require('lodash');
var Class = require('./util/class');
var BluebirdPromise = require('bluebird');
var path = require('path');
var util = require('util');
var fs = BluebirdPromise.promisifyAll(require('fs'));

/**
 * Migrations allow you to define a sequence for moving your schema forward and
 * backward with simple abstractions in JavaScript.
 *
 * @protected
 * @constructor
 * @param {Adapter} adapter The adapter to use when using the query.
 * @param {Schema} schema The schema object that will be used for migrations.
 * @param {String} dir The directory containing the migration files.
 */
var Migration = Class.extend(/** @lends Migration# */ {
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
      return this._query
        .select('azul_migrations', ['id', 'name', 'batch'])
        .order('-name');
    })
    .get('rows')
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
    var query = this._query;
    var schema = this._schema.begin();
    var self = this;
    return schema.execute().bind({})
    .then(function() { return self._loadPendingMigrations(); })
    .tap(function(migrations) { this.result = migrations; })
    .each(function(module) {
      return module.up(schema, query);
    })
    .then(function(migrations) {
      var values = migrations.map(function(migration) {
        return _.pick(migration, 'name', 'batch');
      });
      return values.length ?
        self._query.insert('azul_migrations').values(values) : undefined;
    })
    .then(function() { return schema.commit(); })
    .then(function() { return this.result; })
    .catch(function(e) {
      return schema.rollback().execute().catch(function(rollbackError) {
        _.extend(e, {
          message: util.format('%s, rollback failed: %s', e, rollbackError),
          rollbackError: rollbackError
        });
      }).throw(e);
    });
  },

  /**
   * Rollback migrations.
   *
   * @return {Promise} A promise that will resolve when all rollbacks are
   * complete.
   */
  rollback: function() {
    var batch;
    var query = this._query;
    var schema = this._schema.begin();
    var self = this;
    return schema.execute().bind({})
    .then(function() { return self._loadExecutedMigrations(); })
    .tap(function(migrations) {
      batch = _.max(migrations, 'batch').batch || 1;
    })
    .filter(function(module) { return module.batch === batch; })
    .tap(function(migrations) { this.result = migrations; })
    .each(function(module) {
      return module.down(schema, query);
    })
    .then(function() {
      return self._query.delete('azul_migrations').where({ batch: batch });
    })
    .then(function() { return schema.commit(); })
    .then(function() { return this.result; })
    .catch(function(e) {
      return schema.rollback().execute().catch(function(rollbackError) {
        _.extend(e, {
          message: util.format('%s, rollback failed: %s', e, rollbackError),
          rollbackError: rollbackError
        });
      }).throw(e);
    });
  }
});


module.exports = Migration.reopenClass({ __name__: 'Migration' });
