'use strict';

var _ = require('lodash');
var BaseQuery = require('../../query/base');
var Transaction = require('../../query/mixins/transaction');
var ColumnCreator = require('./column_creator');

/**
 * A query that allows creating tables.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link Schema#createTable}.
 *
 * @protected
 * @constructor CreateTableQuery
 * @extends BaseQuery
 * @mixes Transaction
 */
var CreateTableQuery = BaseQuery.extend();

CreateTableQuery.reopen(Transaction);

CreateTableQuery.reopen(/** @lends CreateTableQuery# */ {
  init: function() { throw new Error('CreateTableQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   * @see {@link Schema#createTable} for parameter details.
   */
  _create: function(name, cb) {
    if (!cb) { throw new Error('Missing callback to create columns.'); }
    this._super();
    this._name = name;
    this._creator = ColumnCreator.create();
    this._options = {
      ifNotExists: false
    };

    cb(this._creator);

    var pkCount = _(this._creator.columns)
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
    this._creator = orig._creator;
    this._options = _.clone(orig._options);
  },

  /**
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    return this._adapter.phrasing.createTable({
      name: this._name,
      columns: this._creator.columns,
      options: this._options
    });
  },

  /**
   * Specify that this table should be created only if one with the same name
   * does not already exist.
   *
   * @method
   * @public
   * @return {ChainedQuery} The newly configured query.
   */
  unlessExists: function() {
    var dup = this._dup();
    dup._options.ifNotExists = true;
    return dup;
  }
});

module.exports = CreateTableQuery.reopenClass({
  __name__: 'CreateTableQuery'
});
