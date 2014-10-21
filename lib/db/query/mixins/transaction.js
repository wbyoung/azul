'use strict';

var Mixin = require('../../../util/mixin');
var BluebirdPromise = require('bluebird');

/**
 * Transaction support for queries.
 *
 * @mixin Transaction
 */
module.exports = Mixin.create(/** @lends Transaction */{
  init: function() {
    this._super.apply(this, arguments);
    this._transactions = [];
  },

  _dup: function() {
    var dup = this._super();
    dup._transactions = this._transactions.slice(0);
    return dup;
  },

  /**
   * Documentation forthcoming.
   */
  transaction: function() {
    return this._transactions[0];
  },

  /**
   * Documentation forthcoming.
   */
  begin: BluebirdPromise.method(function() {
    var dup = this._dup();
    var query = new BeginTransactionQuery(dup._adapter);
    return query.execute({ keepAlive: true }).then(function(result) {
      dup._transactions.unshift(result.client);
    })
    .return(dup);
  }),

  /**
   * Documentation forthcoming.
   */
  commit: BluebirdPromise.method(function() {
    var dup = this._dup();
    var query = new CommitTransactionQuery(dup._adapter)
      .transaction(dup.transaction());

    return query.execute({ close: true }).then(function(result) {
      dup._transactions.shift();
    })
    .return(dup);
  }),

  /**
   * Documentation forthcoming.
   */
  rollback: BluebirdPromise.method(function() {
    var dup = this._dup();
    var query = new RollbackTransactionQuery(dup._adapter)
      .transaction(dup.transaction());

    return query.execute({ close: true }).then(function(result) {
      dup._transactions.shift();
    })
    .return(dup);
  })
});
