'use strict';

var _ = require('lodash');
var BaseQuery = require('../../query/base');
var Transaction = require('../../query/mixins/transaction');
var Procedure = require('../../query/mixins/procedure');
var TableAlterer = require('./table_alterer');
var Statement = require('../../types/statement');

/**
 * A query/procedure that allows altering tables.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link Schema#alterTable}.
 *
 * @protected
 * @constructor AlterTable
 * @extends BaseQuery
 * @mixes Transaction
 * @mixes Procedure
 */
var AlterTable = BaseQuery.extend();

AlterTable.reopen(Transaction);
AlterTable.reopen(Procedure);

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
    this._super();
    this._name = name;
    this._cb = cb;
    this._altererClass = TableAlterer;
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
    this._cb = orig._cb;
    this._altererClass = orig._altererClass;
  },

  /**
   * Configure this query use a reversible table alterer.
   *
   * @method
   * @public
   * @scope internal
   * @return {ChainedQuery} A new query of the given type.
   * @see {@link TableAlterer.Reversible}
   */
  reversible: function() {
    var dup = this._dup();
    dup._altererClass = TableAlterer.Reversible;
    return dup;
  },

  /**
   * Configure this query use a reverse table alterer.
   *
   * @method
   * @public
   * @scope internal
   * @return {ChainedQuery} A new query of the given type.
   * @see {@link TableAlterer.Reverse}
   */
  reverse: function() {
    var dup = this._dup();
    dup._altererClass = TableAlterer.Reverse;
    return dup;
  },

  /**
   * Get the procedure for altering the table.
   *
   * @method
   * @private
   * @return {?Procedure}
   */
  _procedure: function() {
    this._configure();
    return this._adapter.procedures.alterTable(this._data());
  },

  /**
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    this._configure();

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
      addedIndexes: this._alterer.addedIndexes,
      dropped: this._alterer.dropped,
      droppedIndexes: this._alterer.droppedIndexes,
      renamed: this._alterer.renamed,
      renamedIndexes: this._alterer.renamedIndexes,
    };
  },

  /**
   * Configure aspects of the query that require delayed calculation.
   *
   * @method
   * @private
   */
  _configure: function() {
    if (this._alterer) { return; } // only configure once

    if (!this._cb) { throw new Error('Missing callback to alter columns.'); }

    this._alterer = this._altererClass.create(this._name);
    this._cb(this._alterer);

    if (this._pkCount() > 1) {
      throw new Error('Table may only have one primary key column.');
    }
  },

  /**
   * Calculate the number of primary key columns.
   *
   * @method
   * @private
   * @return {Number}
   */
  _pkCount: function() {
    return _(this._alterer.added).map('options')
      .filter('primaryKey').size();
  },

});

module.exports = AlterTable.reopenClass({
  __name__: 'AlterTable'
});
