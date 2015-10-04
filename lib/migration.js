'use strict';

var _ = require('lodash');
var Class = require('corazon/class');
var Promise = require('bluebird');
var path = require('path');
var util = require('util');
var fs = Promise.promisifyAll(require('fs'));

/**
 * @class Migration
 * @classdesc
 *
 * Migrations allow you to define a sequence for moving your schema forward and
 * backward with simple abstractions in JavaScript.
 */
var Migration = Class.extend(/** @lends Migration# */ {

  /**
   * Create a migration.
   *
   * @protected
   * @constructor Migration
   * @param {EntryQuery} query The main entry query.
   * @param {String} dir The directory containing the migration files.
   */
  init: function(query, dir) {
    this._super();
    this._transaction = query.transaction();
    this._query = query.transaction(this._transaction);
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
    return Promise.all([
      self._readMigrations(),
      self._readExecutedMigrations(),
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
    return Promise.bind(this).then(function() {
      var schema = this._query.schema();
      return schema.createTable('azul_migrations', function(table) {
        table.serial('id').primaryKey();
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
   * Execute within a transaction.
   *
   * @param {Migration~TransactionFunction} fn
   * @return {Promise}
   */
  _inTransaction: function(fn) {
    var transaction = this._transaction;
    return transaction.begin()
    .then(fn.bind(this))
    .tap(function() { return transaction.commit(); })
    .catch(function(e) {
      return transaction.rollback().execute().catch(function(rollbackError) {
        _.extend(e, {
          message: util.format('%s, rollback failed: %s', e, rollbackError),
          rollbackError: rollbackError,
        });
      }).throw(e);
    });
  },

  /**
   * Execute a migration function.
   *
   * If the function returns a thenable, then it will be used to resolve the
   * migration. However, if the function does not return a thenable, then we
   * will assume that it is a _serial migration_ function that creates queries
   * that should be executed serially.
   *
   * To handle _serial migrations_, we capture any queries that are created
   * while the function executes. From that set, we remove any query that had
   * another created from it. Basically, this results in the set of _final_
   * queries. For instance:
   *
   *   query.update('articles').set({ id: 1 }).where({ id: 2 })
   *
   * Would only result in on query being captured. All captured queries are
   * executed serially.
   *
   * @param {Function} fn The migration function
   * @param {Schema} schema
   * @param {EntryQuery} query
   * @param {Options} [options]
   * @param {Boolean} [options.changable] Only allow serial execution & do not
   * provide the query argument as the second argument to the function.
   * @param {Boolean} [options.reverse] Reverse serial execution
   * @return {Promise}
   */
  _execute: Promise.method(function(fn, schema, options) {
    var opts = _.defaults({}, options, {
      changable: false,
      reverse: false,
    });
    var query = this._query;
    var captured = [];
    var creators = [];
    var executed = false;
    var reused;

    var observe = function(q) { // jscs:ignore jsDoc
      creators.push(this);
      captured.push(q);
      q.on('spawn', observe);
      q.on('dup', observe);
      q.on('execute', function() { executed = true; });
      _.pull(captured, this); // this was creator, so it's not a _final_ query
    };
    observe.call(schema, schema);
    observe.call(query, query);

    // do not pass query to change migration functions
    if (opts.changable) {
      query = undefined;
    }

    var result = fn(schema, query);
    var promise = result && typeof result.then === 'function';

    creators = _.difference(creators, [schema, query]); // these can be reused
    reused = creators.length > _.uniq(creators).length;

    if (opts.reverse) {
      captured.reverse();
    }

    if (opts.changable && promise) {
      throw new Error('Reversible migrations must be serial.');
    }

    if (!promise && executed) {
      throw new Error('Serial migrations must not execute queries.');
    }
    else if (!promise && reused) {
      throw new Error('Serial migration must not re-use query.');
    }
    else if (!promise) {
      result = Promise.resolve();
      captured.forEach(function(query) {
        result = result.then(function() { return query; });
      });
    }

    return result;
  }),

  /**
   * Perform migrations.
   *
   * @return {Promise} A promise that will resolve when all migrations are
   * complete.
   */
  migrate: function() {
    var self = this;
    return this._inTransaction(function() {
      var query = self._query;
      var schema = query.schema();
      return self._loadPendingMigrations()
      .each(function(module) {
        var changeOptions = { changable: true };
        return module.change ?
          self._execute(module.change, schema.reversible(), changeOptions) :
          self._execute(module.up, schema);
      })
      .tap(function(migrations) {
        var values = migrations.map(function(migration) {
          return _.pick(migration, 'name', 'batch');
        });
        return values.length ?
          query.insert('azul_migrations').values(values) : undefined;
      });
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
    var self = this;
    return this._inTransaction(function() {
      var query = self._query;
      var schema = query.schema();
      return self._loadExecutedMigrations()
      .tap(function(migrations) {
        batch = _.max(migrations, 'batch').batch || 1;
      })
      .filter(function(module) { return module.batch === batch; })
      .each(function(module) {
        var changeOptions = { changable: true, reverse: true };
        return module.change ?
          self._execute(module.change, schema.reverse(), changeOptions) :
          self._execute(module.down, schema);
      })
      .tap(function() {
        return query.delete('azul_migrations').where({ batch: batch });
      });
    });
  },
});


module.exports = Migration.reopenClass({ __name__: 'Migration' });
