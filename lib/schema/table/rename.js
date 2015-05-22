'use strict';

var BaseQuery = require('../../query/base');
var Transaction = require('../../query/mixins/transaction');

/**
 * A query that allows renaming tables.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link Schema#renameTable}.
 *
 * @protected
 * @constructor RenameTableQuery
 * @extends BaseQuery
 * @mixes Transaction
 */
var RenameTableQuery = BaseQuery.extend();

RenameTableQuery.reopen(Transaction);

RenameTableQuery.reopen(/** @lends RenameTableQuery# */ {
  init: function() { throw new Error('RenameTableQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   * @see {@link Schema#renameTable} for parameter details.
   */
  _create: function(from, to) {
    this._super();
    this._from = from;
    this._to = to;
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
    this._from = orig._from;
    this._to = orig._to;
  },

  /**
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    return this._adapter.phrasing.renameTable({
      from: this._from,
      to: this._to,
    });
  },

});

module.exports = RenameTableQuery.reopenClass({
  __name__: 'RenameTableQuery'
});
