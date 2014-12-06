'use strict';

var BaseQuery = require('./base');
var Statement = require('../grammar/statement');

/**
 * Create a raw query.
 *
 * @since 1.0
 * @public
 * @method EntryQuery#raw
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
 * @since 1.0
 * @protected
 * @constructor RawQuery
 * @extends BaseQuery
 */
var RawQuery = BaseQuery.extend(/** @lends RawQuery# */ {
  init: function() { throw new Error('RawQuery must be spawned.'); },

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
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._sql = orig._sql;
    this._args = orig._args && orig._args.slice(0);
  },

  sql: function() {
    return Statement.create(this._sql, this._args);
  }

});

module.exports = RawQuery.reopenClass({ __name__: 'RawQuery' });
