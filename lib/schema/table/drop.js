'use strict';

var _ = require('lodash');
var BaseQuery = require('../../query/base');
var Transaction = require('../../query/mixins/transaction');

/**
 * A query that allows dropping tables.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link Schema#dropTable}.
 *
 * @protected
 * @constructor DropTableQuery
 * @extends BaseQuery
 * @mixes Transaction
 */
var DropTableQuery = BaseQuery.extend();

DropTableQuery.reopen(Transaction);

DropTableQuery.reopen(/** @lends DropTableQuery# */ {
  init: function() { throw new Error('DropTableQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   * @see {@link Schema#dropTable} for parameter details.
   */
  _create: function(name) {
    this._super();
    this._name = name;
    this._options = {
      ifExists: false
    };
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
    return this._adapter.phrasing.dropTable({
      name: this._name,
      options: this._options
    });
  },

  /**
   * Specify that this table should be dropped only if it exists.
   *
   * @method
   * @public
   * @return {ChainedQuery} The newly configured query.
   */
  ifExists: function() {
    var dup = this._dup();
    dup._options.ifExists = true;
    return dup;
  }
});

module.exports = DropTableQuery.reopenClass({
  __name__: 'DropTableQuery'
});
