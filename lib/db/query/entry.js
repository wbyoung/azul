'use strict';

var BaseQuery = require('./base');
var SelectQuery = require('./select');
var InsertQuery = require('./insert');
var DeleteQuery = require('./delete');
var RawQuery = require('./raw');
var Transaction = require('./mixins/transaction');

/**
 * Queries are the building block of Azul's database abstraction layer. They
 * are immutable, chainable objects. Each operation that you perform on a query
 * will return a duplicated query rather than the original. The duplicated
 * query will be configured as requested.
 *
 * Generally, you will not create queries directly. Instead, you will receive
 * a query object via one of many convenience methods.
 *
 * @since 1.0
 * @protected
 * @constructor EntryQuery
 * @param {Adapter} adapter The adapter to use when using the query.
 */
var EntryQuery = BaseQuery.extend(Transaction, /** @lends EntryQuery# */{

  select: function() { return this._spawn(SelectQuery, arguments); },
  insert: function() { return this._spawn(InsertQuery, arguments); },
  delete: function() { return this._spawn(DeleteQuery, arguments); },
  raw: function() { return this._spawn(RawQuery, arguments); },

  sql: function() {
    var result = this._super();
    if (!result) {
      throw new Error(
        'Must first call `select`, `update`, `insert`, or `delete` on query');
    }
    return result;
  }
});

module.exports = EntryQuery.reopenClass({ __name__: 'EntryQuery' });
