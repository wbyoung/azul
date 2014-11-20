'use strict';

var util = require('util');
var Mixin = require('../../util/mixin');
var BluebirdPromise = require('bluebird');

/**
 * Transaction support for queries.
 *
 * @mixin Transaction
 */
module.exports = Mixin.create(/** @lends Transaction# */{

  /**
   * Documentation forthcoming.
   */
  _take: function(orig) {
    this._super(orig);
    this._transaction = orig._transaction;
  },

  /**
   * Documentation forthcoming.
   */
  client: function() {
    return (this._transaction && this._transaction._transactionClient) ||
      this._super();
  },

  /**
   * Documentation forthcoming.
   */
  transaction: function(transaction) {
    var result;
    if (arguments.length === 0) { // getter
      result = this._transaction;
    }
    else { // setter
      var sql = this._transactionSQLOverride;
      var dup = this._dup();
      dup._transaction = transaction;

      if (sql) { dup._transactionSQLOverride = sql; }
      if (sql === 'rollback' || sql === 'commit') {
        dup._prepareForTransactionClientRelease();
      }

      result = dup;
    }
    return result;
  },

  /**
   * Documentation forthcoming.
   */
  validateBeforeTransactionExecution: function() {
    var transaction = this._transaction;
    if (this._transactionSQLOverride === 'begin') {
      // don't throw for beginning a transaction
    }
    else if (!transaction && this._transactionSQLOverride) {
      throw new Error(util.format('Must associate %j with a transaction.',
        this._transactionSQLOverride));
    }
    else if (transaction && transaction._transactionNeedsToAcquireClient) {
      throw new Error('Must execute `begin` query before using transaction.');
    }
    else if (transaction && transaction._transactionClosed &&
      !this._transactionSQLOverride) {
      throw new Error('Cannot execute query using ' +
        'committed/resolved transaction.');
    }
    return true;
  },

  /**
   * Documentation forthcoming.
   */
  beforeTransactionExecution: BluebirdPromise.method(function() {
    if (!this.validateBeforeTransactionExecution() ||
        !this._transaction) { return; }

    var result;
    var transaction = this._transaction;
    if (transaction._transactionNeedsToAcquireClient) {
      result = transaction._adapter.pool
      .acquireAsync()
      .then(function(client) {
        transaction._transactionClient = client;
      });
      transaction._transactionClientPromise = result;
      transaction._transactionNeedsToAcquireClient = false;
    }
    else {
      // all queries that are chained off of this one or explicitly use this
      // transaction need to wait on the promise that was first created to
      // fulfill so that they'll have a client.
      result = transaction._transactionClientPromise;
    }
    return result;
  }),

  /**
   * Documentation forthcoming.
   */
  afterTransactionExecution: BluebirdPromise.method(function() {
    if (!this._transaction) { return; }

    var transaction = this._transaction;
    if (transaction._transactionNeedsToReleaseClient) {
      transaction._adapter.pool.release(transaction._transactionClient);
      transaction._transactionClient = undefined;
      transaction._transactionNeedsToReleaseClient = false;
    }
  }),

  /**
   * Override of {@link BaseQuery#execute}.
   *
   * @private
   * @see {@link BaseQuery#execute}
   */
  execute: BluebirdPromise.method(function() {
    var self = this;
    return this.beforeTransactionExecution()
      .then(this._super)
      .tap(function() { return self.afterTransactionExecution(); });
  }),

  /**
   * Documentation forthcoming.
   */
  begin: function() {
    var dup = this._dup();
    dup._transactionSQLOverride = 'begin';
    dup._transaction = dup._transaction || dup;
    dup._prepareForTransactionClientAcquire();
    return dup;
  },

  /**
   * Documentation forthcoming.
   */
  commit: function() {
    var dup = this._dup();
    dup._transactionSQLOverride = 'commit';
    dup._prepareForTransactionClientRelease();
    return dup;
  },

  /**
   * Documentation forthcoming.
   */
  rollback: function() {
    var dup = this._dup();
    dup._transactionSQLOverride = 'rollback';
    dup._prepareForTransactionClientRelease();
    return dup;
  },

  /**
   * Documentation forthcoming.
   */
  _prepareForTransactionClientAcquire: function() {
    if (!this._transaction) { return; }
    if (!this._transaction._transactionDepth) {
      this._transaction._transactionDepth = 0;
      this._transaction._transactionNeedsToAcquireClient = true;
    }
    this._transaction._transactionDepth += 1;
  },

  /**
   * Documentation forthcoming.
   */
  _prepareForTransactionClientRelease: function() {
    if (!this._transaction) { return; }
    if (this._transaction._transactionDepth === 1) {
      this._transaction._transactionNeedsToReleaseClient = true;
      this._transaction._transactionClosed = true;
    }
    this._transaction._transactionDepth -= 1;
  },

  /**
   * Override of {@link BaseQuery#sql}.
   *
   * @private
   * @see {@link BaseQuery#sql}
   */
  sql: function() {
    return this._transactionSQLOverride ?
      this._adapter.phrasing[this._transactionSQLOverride]() : this._super();
  }
});
