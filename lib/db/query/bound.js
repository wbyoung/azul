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

  _spawn: function(type, args) {
    args = args ? Array.prototype.slice.call(args) : [];
    args.unshift(this._table);
    return this._super(type, args);
  },

  all: function() { return this._spawn(SelectQuery, arguments); },
  insert: function() { return this._spawn(InsertQuery, arguments); },
  update: function() { return this._spawn(UpdateQuery, arguments); },
  delete: function() { return this._spawn(DeleteQuery, arguments); },
  raw: function() { return this._spawn(RawQuery, arguments); },

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
