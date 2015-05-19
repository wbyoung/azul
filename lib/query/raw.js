'use strict';

var BaseQuery = require('./base');
var Statement = require('../types/statement');
var Fetch = require('./mixins/fetch');
var Transaction = require('./mixins/transaction');

/**
 * Create a raw query.
 *
 * @method EntryQuery#raw
 * @public
 * @param {String|Statement} sql The SQL string or a statement to execute. If
 * this is a statement, the args will be used from the statement rather than
 * the provided args.
 * @param {Array} [args] The arguments for the SQL.
 * @return {RawQuery} The newly configured query.
 * @see Database#raw
 */

/**
 * A raw query.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link EntryQuery#raw}.
 *
 * @protected
 * @constructor RawQuery
 * @extends BaseQuery
 * @mixes Transaction
 */
var RawQuery = BaseQuery.extend(Fetch, Transaction, /** @lends RawQuery# */ {
  init: function() { throw new Error('RawQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   * @see {@link Database#raw} for parameter details.
   */
  _create: function(sql, args) {
    if (sql instanceof Statement.__class__) {
      if (args) {
        throw new Error('Should not provide both statement and args');
      }
      var statement = sql;
      sql = statement.sql;
      args = statement.args;
    }
    this._super();
    this._sql = sql;
    this._args = args;
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
    this._sql = orig._sql;
    this._args = orig._args && orig._args.slice(0);
  },

  /**
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    return Statement.create(this._sql, this._args);
  }

});

module.exports = RawQuery.reopenClass({ __name__: 'RawQuery' });
