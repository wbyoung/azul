'use strict';

var _ = require('lodash');
var BaseQuery = require('../../query/base');
var Transaction = require('../../query/mixins/transaction');
var ColumnAlterer = require('./column_alterer');

/**
 * A query that allows altering tables.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link Schema#alterTable}.
 *
 * @protected
 * @constructor AlterTableQuery
 * @extends BaseQuery
 * @mixes Transaction
 */
var AlterTableQuery = BaseQuery.extend();

AlterTableQuery.reopen(Transaction);

AlterTableQuery.reopen(/** @lends AlterTableQuery# */ {
  init: function() { throw new Error('AlterTableQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   * @see {@link Schema#alterTable} for parameter details.
   */
  _create: function(name, cb) {
    if (!cb) { throw new Error('Missing callback to create columns.'); }
    this._super();
    this._name = name;
    this._alterer = ColumnAlterer.create();

    cb(this._alterer);

    var pkCount = _(this._alterer.added)
      .map('options').filter('primaryKey').size();
    if (pkCount > 1) {
      throw new Error('Table may only have one primary key column.');
    }
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
    this._name = orig._name;
    this._alterer = orig._alterer;
  },

  /**
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    return this._adapter.phrasing.alterTable({
      name: this._name,
      added: this._alterer.added,
      dropped: this._alterer.dropped,
      renamed: this._alterer.renamed
    });
  }

});

module.exports = AlterTableQuery.reopenClass({
  __name__: 'AlterTableQuery'
});
