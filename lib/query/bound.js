'use strict';

var BaseQuery = require('./base');
var SelectQuery = require('./select');
var InsertQuery = require('./insert');
var UpdateQuery = require('./update');
var DeleteQuery = require('./delete');
var RawQuery = require('./raw');
var Where = require('./mixins/where');

/**
 * A bound query.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link EntryQuery#bind}.
 *
 * @since 1.0
 * @protected
 * @constructor BoundQuery
 * @extends BaseQuery
 * @mixes Where
 */
var BoundQuery = BaseQuery.extend(Where, /** @lends BoundQuery# */{
  init: function() { throw new Error('BoundQuery must be spawned.'); },

  _create: function(table) {
    this._super();
    this._table = table;
  },

  _take: function(orig) {
    this._super(orig);
    this._table = orig._table;
  },

  _spawnBound: function(type, args) {
    args = Array.prototype.slice.call(args);
    args.unshift(this._table);
    return this._spawn(type, args);
  },

  _ensureWhereNotUsed: function(queryType) {
    if (this._where) {
      throw new Error(
        'Cannot perform `' + queryType + '` on query after using `where`.');
    }
  },

  all: function() { return this._spawnBound(SelectQuery, arguments); },
  delete: function() { return this._spawnBound(DeleteQuery, arguments); },
  update: function() { return this._spawnBound(UpdateQuery, arguments); },
  insert: function() {
    this._ensureWhereNotUsed('insert');
    return this._spawnBound(InsertQuery, arguments);
  },
  raw: function() {
    this._ensureWhereNotUsed('raw');
    return this._spawn(RawQuery, arguments);
  },

  /**
   * If executed directly, this works as a select query.
   * Override of {@link BaseQuery#sql}.
   *
   * @private
   * @see {@link BaseQuery#execute}
   */
  sql: function() {
    return this.all().sql();
  }

});

module.exports = BoundQuery.reopenClass({ __name__: 'BoundQuery' });
