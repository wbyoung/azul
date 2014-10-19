'use strict';

var BluebirdPromise = require('bluebird');
var Statement = require('../grammar/statement');
var Class = require('../../util/class');

/**
 * Queries are the building block of Azul's database abstraction layer. They
 * are immutable, chainable objects. Each operation that you perform on a query
 * will return a duplicated query rather than the original. The duplicated
 * query will be configured as requested.
 *
 * Generally, you will not create queries directly. Instead, you will receive
 * a query object via one of many convenience methods.
 *
 * @since 1.0
 * @protected
 * @constructor RawQuery
 * @param {Adapter} adapter The adapter to use when using the query.
 * @param {String|Statement} sql The SQL string or a statement to execute. If
 * this is a statement, the args will be used from the statement rather than
 * the provided args.
 * @param {Array} [args] The arguments for the SQL.
 */
var RawQuery = Class.extend(/** @lends RawQuery# */{
  init: function(adapter, sql, args) {
    if (sql instanceof Statement.__class__) {
      if (args) {
        throw new Error('Should not provide both statement and args');
      }
      var statement = sql;
      sql = statement.sql;
      args = statement.arguments;
    }
    this._super();
    this._adapter = adapter;
    this._sql = sql;
    this._args = args;
    this._executed = false;
    this._promise = new BluebirdPromise(function(resolve, reject) {
      this._resolve = resolve;
      this._reject = reject;
    }.bind(this));
  },

  /**
   * This method duplicates a query. Queries are immutable objects. All query
   * methods should return copies of the query rather than mutating any internal
   * state.
   *
   * This method is implemented by subclasses to complete duplication of an
   * object. Be sure to call `_super()`. Subclasses should duplicate and
   * reassign all properties that are considered mutable.
   *
   * @since 1.0
   * @protected
   * @method
   * @return {RawQuery} The duplicated query.
   */
  _dup: function() {
    var dup = this.__identity__.new();
    dup._adapter = this._adapter;
    dup._sql = this._sql;
    dup._args = this._args;
    dup._executed = false;
    dup._promise = new BluebirdPromise(function(resolve, reject) {
      dup._resolve = resolve;
      dup._reject = reject;
    });
    return dup;
  },

  /**
   * Get the SQL for a query.
   *
   * This method simply returns the sql for the query, but can be overridden in
   * sub-classes to provide SQL that is customized on a per-adapter basis when
   * possible.
   *
   * @since 1.0
   * @public
   * @method
   * @return {Statement} An object containing `sql`, the
   * SQL string for the query, and `arguments`, an array of arguments for the
   * query.
   */
  sql: function() {
    return Statement.create(this._sql, this._args);
  },

  /**
   * Execute the query.
   *
   * @return {Promise} A promise that will resolve when execution is complete.
   */
  execute: function() {
    if (!this._executed) {
      var statement = this.sql();
      this._executed = true;
      this._adapter.execute(statement.sql, statement.arguments)
        .then(this._resolve, this._reject);
    }
    return this._promise;
  },

  /**
   * {@link RawQuery} is a _thenable_ object.
   *
   * @param {Function} fulfilledHandler
   * @param {Function} rejectedHandler
   * @return {Promise}
   */
  then: function(fulfilledHandler, rejectedHandler) {
    this.execute();
    return this._promise.then(fulfilledHandler, rejectedHandler);
  }
});

module.exports = RawQuery.reopenClass({ __name__: 'RawQuery' });
