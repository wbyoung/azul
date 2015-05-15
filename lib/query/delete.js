'use strict';

var BaseQuery = require('./base');
var Where = require('./mixins/where');
var Transaction = require('./mixins/transaction');

/**
 * Begin a delete query chain. Like all other methods that begin a query chain,
 * this method is intended to be called only once and is mutually exclusive
 * with those methods.
 *
 *     delete('users').where({ name: 'Whitney' })
 *     // -> delete from "users" where "name" = ?
 *     // !> ['Whitney']
 *
 * The preferred method for beginning a query chain is to use the convenience
 * methods provided by the {@link Database}.
 *
 * @method EntryQuery#delete
 * @public
 * @param {String} table The table in which to delete data.
 * @return {DeleteQuery} The newly configured query.
 * @see Database#delete
 */

/**
 * A delete query.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link EntryQuery#delete}.
 *
 * @protected
 * @constructor DeleteQuery
 * @extends BaseQuery
 * @mixes Where
 * @mixes Transaction
 */
var DeleteQuery = BaseQuery.extend();

DeleteQuery.reopen(Where);
DeleteQuery.reopen(Transaction);

DeleteQuery.reopen(/** @lends DeleteQuery# */ {
  init: function() { throw new Error('DeleteQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   * @see {@link Database#delete} for parameter details.
   */
  _create: function(table) {
    this._super();
    this._table = table;
  },

  /**
   * Duplication implementation.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._table = orig._table;
  },

  /**
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    return this._adapter.phrasing.delete({
      table: this._table,
      where: this._where
    });
  }

});

module.exports = DeleteQuery.reopenClass({ __name__: 'DeleteQuery' });
