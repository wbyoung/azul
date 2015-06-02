'use strict';

var Mixin = require('corazon/mixin');


/**
 * Transaction support for queries.
 *
 * @mixin Transaction
 */
module.exports = Mixin.create(/** @lends Transaction# */ {

  /**
   * Duplication implementation.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._transaction = orig._transaction;
  },

  /**
   * Override of {@link BaseQuery#_client}.
   *
   * @private
   * @see {@link BaseQuery#_client}
   */
  _client: function() {
    return this._transaction ?
      this._transaction.acquireClient() :
      this._super.apply(this, arguments);
  },

  /**
   * Get the transaction for a query.
   *
   * @method Transaction#transaction
   * @public
   * @return {TransactionQuery} The existing transaction query.
   */

  /**
   * Create a new query that will be performed within the given transaction.
   *
   * @method Transaction#transaction
   * @public
   * @param {TransactionQuery} transaction The transaction object.
   * @return {ChainedQuery} The newly configured query.
   */
  transaction: function(transaction) {
    var result;
    if (arguments.length === 0) { // getter
      // call super in case this is a query that generates transaction objects.
      // for instance, the entry query, `db.query`, generates transactions.
      result = this._transaction || this._super();
    }
    else { // setter
      var dup = this._dup();
      dup._transaction = transaction;
      result = dup;
    }
    return result;
  },

});
