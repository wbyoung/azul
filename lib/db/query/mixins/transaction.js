'use strict';

var _ = require('lodash');
var util = require('util');
var Mixin = require('../../../util/mixin');
var BluebirdPromise = require('bluebird');

/**
 * Transaction support for queries.
 *
 * @mixin Transaction
 */
module.exports = Mixin.create(/** @lends Transaction */{

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
    // TODO: write some tests that use the getter.
    var result;
    if (arguments.length === 0) { // getter
      result = this._transaction;
    }
    else { // setter
      var dup = this._dup();
      dup._transaction = transaction;

      if (this._transactionSQLOverride) {
        dup._transactionSQLOverride = this._transactionSQLOverride;
      }

      if (_.contains(['rollback', 'commit'], this._transactionSQLOverride)) {
        dup._transaction._transactionNeedsReleasing = true;
        dup._transaction._transactionClosed = true;
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
    else if (transaction && !transaction._transactionClient) {
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

    var transaction = this._transaction;
    var result =
      transaction._transactionClient ||
      transaction._transactionClientPromise;

    if (!result) {
      result = transaction._adapter.pool
      .acquireAsync()
      .then(function(client) {
        transaction._transactionClient = client;
      });
      transaction._transactionClientPromise = result;
    }
    return result;
  }),

  /**
   * Documentation forthcoming.
   */
  afterTransactionExecution: BluebirdPromise.method(function() {
    if (!this._transaction) { return; }

    var transaction = this._transaction;
    if (transaction._transactionNeedsReleasing) {
      transaction._adapter.pool.release(transaction._transactionClient);
      transaction._transactionNeedsReleasing = false;
    }
  }),

  /**
   * Override of {@link RawSQL#execute}.
   *
   * @private
   * @see {@link RawSQL#execute}
   */
  execute: function() {
    var self = this;
    return this.beforeTransactionExecution()
      .then(this._super)
      .then(function() {
        return self.afterTransactionExecution();
      });
  },

  /**
   * Documentation forthcoming.
   */
  begin: function() {
    var dup = this._dup();
    dup._transactionSQLOverride = 'begin';
    dup._transaction = dup;
    return dup;
  },

  /**
   * Documentation forthcoming.
   */
  commit: function() {
    var dup = this._dup();
    dup._transactionSQLOverride = 'commit';
    if (dup._transaction) {
      // TODO: duplicated code
      dup._transaction._transactionNeedsReleasing = true;
      dup._transaction._transactionClosed = true;
    }
    return dup;
  },

  /**
   * Documentation forthcoming.
   */
  rollback: function() {
    var dup = this._dup();
    dup._transactionSQLOverride = 'rollback';
    if (dup._transaction) {
      // TODO: duplicated code
      dup._transaction._transactionNeedsReleasing = true;
      dup._transaction._transactionClosed = true;
    }
    return dup;
  },

  /**
   * Override of {@link RawSQL#sql}.
   *
   * @private
   * @see {@link RawSQL#sql}
   */
  sql: function() {
    return this._transactionSQLOverride ?
      this._adapter.phrasing[this._transactionSQLOverride]() : this._super();
  }
});
