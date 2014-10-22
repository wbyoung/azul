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
    // TODO: all mixins currently use `new` to ensure that they always have
    // the required properties to operate correctly. that wouldn't be necessary
    // if we could figure out which mixins are part of the new `type` class
    // that are not part of `this` query object's class. we could then call
    // `init` on each of those mixins before calling `_take` and `_create`.
    var query = type.new();
    this.__class__.prototype._take.call(query, this);
    type.__class__.prototype._create.apply(query, arguments);
    return query;
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
 * @constructor EntryQuery
 * @param {Adapter} adapter The adapter to use when using the query.
 */
var EntryQuery = RawQuery.extend(Transaction, /** @lends EntryQuery# */{

  select: specific(SelectQuery),
  insert: specific(InsertQuery),
  delete: specific(DeleteQuery),

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
