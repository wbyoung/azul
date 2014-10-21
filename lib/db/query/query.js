'use strict';

var RawQuery = require('./raw');
var SelectQuery = require('./select');
var InsertQuery = require('./insert');
var DeleteQuery = require('./delete');
var Transaction = require('./mixins/transaction');

/**
 * Return a function that will construct a new specific type of query and pass
 * off arguments to the constructor of that query. The arguments that are
 * passed through will also be prefixed with the `_adapter`.
 *
 * @name Query~specific
 * @private
 * @param {Class} type The query type to use.
 * @return {Function} A function that constructs the specific type of query.
 */
var specific = function(type) {
  return function() {
    // TODO: this need to support transactions in some way. it'd be better to
    // use something like `_dup` that support copying the transactions, bu the
    // way it's currently set up, that wouldn't work.
    return type.create.apply(type,
      [this._adapter].concat(Array.prototype.slice.call(arguments)));
  };
};

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
 * @constructor Query
 * @param {Adapter} adapter The adapter to use when using the query.
 */
var Query = RawQuery.extend(Transaction, /** @lends Query# */{

  select: specific(SelectQuery),
  insert: specific(InsertQuery),
  delete: specific(DeleteQuery),

  sql: function() {
    throw new Error(
      'Must first call `select`, `update`, `insert`, or `delete` on query');
  }
});

module.exports = Query.reopenClass({ __name__: 'Query' });
