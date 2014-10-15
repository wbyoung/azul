'use strict';

var BluebirdPromise = require('bluebird');
var Class = require('../../util/class');

/**
 * Queries are the building block of Agave's database abstraction layer. They
 * are immutable, chainable objects. Each operation that you perform on a query
 * will return a duplicated query rather than the original. The duplicated
 * query will be configured as requested.
 *
 * Generally, you will not create queries directly. Instead, you will receive
 * a query object via one of many convenience methods.
 *
 * @since 1.0
 * @protected
 * @constructor
 * @param {Adapter} adapter The adapter to use when using the query.
 */
var RawQuery = Class.extend(/** @lends RawQuery# */{
  init: function(adapter, sql, args) {
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
    var dup = this.__identity__.create();
    dup._adapter = this._adapter;
    dup._sql = this._sql;
    dup._args = this._args;
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
   * @return {{sql: String, arguments:Array}} An object containing `sql`, the
   * SQL string for the query, and `arguments`, an array of arguments for the
   * query.
   */
  sql: function() {
    return { sql: this._sql, arguments: this._args };
  },

  /**
   * Execute the query.
   *
   * @return {Promise} A promise that will resolve when execution is complete.
   */
  execute: function() {
    if (!this._executed) {
      this._executed = true;
      this._adapter.execute(this.sql()).then(this._resolve, this._reject);
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
