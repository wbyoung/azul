'use strict';

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
  transaction: function(transaction) {
    // TODO: write some tests that use the getter.
    var result;
    if (arguments.length === 0) { // getter
      result = this._transaction;
    }
    else { // setter
      var dup = this._dup();
      dup._transaction = transaction;
      result = dup;
    }
    return result;
  },

  /**
   * Documentation forthcoming.
   */
  beforeExecution: BluebirdPromise.method(function() {
    if (!this._transaction) { return; }

    var transaction = this._transaction;
    return this._super().bind({}).then(function() {
      var result = transaction._client || transaction._clientPromise;
      if (!result) {
        result = transaction._clientPromise =
        transaction._adapter.pool.acquireAsync()
        .then(function(client) {
          transaction._client = client;
        });
      }
      return result;
    });
  }),

  /**
   * Override of {@link RawSQL#execute}.
   *
   * @private
   * @see {@link RawSQL#execute}
   */
  execute: function() {
    return this.beforeExecution().then(this._super);
  },

  /**
   * Documentation forthcoming.
   */
  begin: function() {
    var dup = this._dup();
    dup._transactionAction = 'begin';
    return dup;
  },

  /**
   * Documentation forthcoming.
   */
  commit: function() {
    var dup = this._dup();
    dup._transactionAction = 'commit';
    dup._client = undefined;
    return dup;
  },

  /**
   * Documentation forthcoming.
   */
  rollback: function() {
    var dup = this._dup();
    dup._transactionAction = 'rollback';
    return dup;
  },

  /**
   * Override of {@link RawSQL#sql}.
   *
   * @private
   * @see {@link RawSQL#sql}
   */
  sql: function() {
    return this._transactionAction ?
      this._adapter.phrasing[this._transactionAction]() : this._super();
  }
});
