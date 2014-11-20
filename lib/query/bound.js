'use strict';

var _ = require('lodash');
var BaseQuery = require('./base');
var SelectQuery = require('./select');
var InsertQuery = require('./insert');
var UpdateQuery = require('./update');
var DeleteQuery = require('./delete');
var RawQuery = require('./raw');
var Where = require('./mixins/where');
var Order = require('./mixins/order');

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
var BoundQuery = BaseQuery.extend(Where, Order, /** @lends BoundQuery# */{
  init: function() { throw new Error('BoundQuery must be spawned.'); },

  _create: function(table) {
    this._super();
    this._table = table;
  },

  _take: function(orig) {
    this._super(orig);
    this._table = orig._table;
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  _validateSpawn: function(type, operation, allowed) {
    var name = type.__name__.replace(/Query$/, '').toLowerCase();
    var isAllowed = _.contains(allowed, type);
    if (!isAllowed) {
      throw new Error('Cannot perform `' +
        name + '` on query after using `' + operation + '`.');
    }
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  _spawn: function(type) {
    if (this._where) {
      this._validateSpawn(type, 'where', [
        SelectQuery, DeleteQuery, UpdateQuery
      ]);
    }
    if (this._order.length) {
      this._validateSpawn(type, 'orderBy', [SelectQuery]);
    }
    return this._super.apply(this, arguments);
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  _spawnBound: function(type, args) {
    args = Array.prototype.slice.call(args);
    args.unshift(this._table);
    return this._spawn(type, args);
  },

  all: function() { return this._spawnBound(SelectQuery, arguments); },
  delete: function() { return this._spawnBound(DeleteQuery, arguments); },
  update: function() { return this._spawnBound(UpdateQuery, arguments); },
  insert: function() { return this._spawnBound(InsertQuery, arguments); },
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
