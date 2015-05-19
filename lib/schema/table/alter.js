'use strict';

var _ = require('lodash');
var BaseQuery = require('../../query/base');
var EntryQuery = require('../../query/entry');
var Transaction = require('../../query/mixins/transaction');
var ColumnAlterer = require('./column_alterer');
var Statement = require('../../grammar/statement');

/**
 * A query/procedure that allows altering tables.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link Schema#alterTable}.
 *
 * @protected
 * @constructor AlterTableQuery
 * @extends BaseQuery
 * @mixes Transaction
 */
var AlterTable = BaseQuery.extend();

AlterTable.reopen(Transaction);

AlterTable.reopen(/** @lends AlterTable# */ {
  init: function() { throw new Error('AlterTable must be spawned.'); },

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
    this._alterer = ColumnAlterer.create(name);

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
   * Override of {@link BaseQuery#execute}.
   *
   * Executes the query normally if a procedure is not required. Otherwise it
   * executes the procedure (and this is no longer truly operating like a
   * query object).
   *
   * @method
   * @protected
   * @see {@link BaseQuery#execute}
   */
  execute: function() {
    var procedure = this._procedure();
    return procedure ?
      procedure(this._spawn(EntryQuery, []), this._data()) :
      this._super.apply(this, arguments);
  },

  /**
   * Get the procedure for altering the table.
   *
   * This checks that the adapter defines a procedure, `alterTable`, and
   * determines if it should be used by calling `useAlterTable`.
   *
   * Once the resulting function is invoked, the procedure will run to
   * completion. The procedure function returns a promise.
   *
   * @method
   * @private
   * @return {?Function}
   */
  _procedure: function() {
    var procedures = this._adapter.procedures;
    return procedures.alterTable && procedures.useAlterTable(this._data()) ?
      procedures.alterTable.bind(procedures) : undefined;
  },

  /**
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    var statement = this._adapter.phrasing.alterTable(this._data());
    if (this._procedure()) {
      statement = Statement.create('-- procedure for ' +
        statement.value, statement.args);
    }
    return statement;
  },

  /**
   * Get the data for statement/procedure generation.
   *
   * @method
   * @private
   * @return {Object}
   */
  _data: function() {
    return {
      name: this._name,
      added: this._alterer.added,
      dropped: this._alterer.dropped,
      renamed: this._alterer.renamed
    };
  },

});

module.exports = AlterTable.reopenClass({
  __name__: 'AlterTable'
});
