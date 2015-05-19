'use strict';

var _ = require('lodash');
var util = require('util');
var BaseQuery = require('./base');

_.str = require('underscore.string');
_.mixin({ toSentenceSerial: _.str.toSentenceSerial });


/**
 * Queries are the building block of Azul's database abstraction layer. They
 * are immutable, chainable objects. Each operation that you perform on a query
 * will return a duplicated query rather than the original. The duplicated
 * query will be configured as requested.
 *
 * Generally, you will not create queries directly. Instead, you will receive
 * a query object via one of many convenience methods.
 *
 * @protected
 * @constructor EntryQuery
 * @param {Adapter} adapter The adapter to use when using the query.
 * @extends BaseQuery
 * @mixes Transaction
 */
var EntryQuery = module.exports = BaseQuery.extend(); // allow circular require

var SelectQuery = require('./select');
var InsertQuery = require('./insert');
var UpdateQuery = require('./update');
var DeleteQuery = require('./delete');
var BoundQuery = require('./bound');
var SchemaQuery = require('../schema');
var RawQuery = require('./raw');
var TransactionQuery = require('./transaction');

EntryQuery.reopen(/** @lends EntryQuery# */ {

  // spawn methods (documentation in files with class definitions)
  select: function() { return this._spawn(SelectQuery, arguments); },
  insert: function() { return this._spawn(InsertQuery, arguments); },
  update: function() { return this._spawn(UpdateQuery, arguments); },
  delete: function() { return this._spawn(DeleteQuery, arguments); },
  raw: function() { return this._spawn(RawQuery, arguments); },
  bind: function() { return this._spawn(BoundQuery, arguments); },
  schema: function() { return this._spawn(SchemaQuery, arguments); },
  transaction: function() { return this._spawn(TransactionQuery, arguments); },

  /**
   * Override of {@link BaseQuery#statement}. Verifies that this is not used
   * directly.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    var quote = function(str) { return _.str.quote(str, '`'); };
    var msg = util.format('Must first call %s on query.', _([
      'select',
      'update',
      'insert',
      'delete',
      'raw',
      'bind',
      'schema',
    ]).map(quote).toSentenceSerial(', ', ' or '));
    throw new Error(msg);
  }
});

// mixin transaction after, so that transaction mixin's `transaction` method
// can override the entry query `transaction` method & call super to actually
// generate the transaction objects.
EntryQuery.reopen(require('./mixins/transaction'));

EntryQuery.reopenClass({ __name__: 'EntryQuery' });
