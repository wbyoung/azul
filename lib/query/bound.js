'use strict';

var _ = require('lodash');
var BaseQuery = require('./base');
var SelectQuery = require('./select');
var InsertQuery = require('./insert');
var UpdateQuery = require('./update');
var DeleteQuery = require('./delete');
var RawQuery = require('./raw');
var Where = require('./mixins/where');
var Limit = require('./mixins/limit');
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
var BoundQuery = BaseQuery.extend();

BoundQuery.reopen(Where);
BoundQuery.reopen(Limit);
BoundQuery.reopen(Order);

BoundQuery.reopen(/** @lends BoundQuery# */ {
  init: function() { throw new Error('BoundQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @private
   * @method
   * @param {String} table The table name to lock in / bind to this query.
   * @see {@link BaseQuery#_create}
   */
  _create: function(table) {
    this._super();
    this._table = table;
  },

  /**
   * Duplication implementation.
   *
   * @see {@link BaseQuery#_take}
   */
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
   * Override of {@link BaseQuery#_spawn}.
   *
   * Performs additional validations when different mixin based methods have
   * been used with the query prior to the spawn.
   *
   * @private
   * @method
   * @see {@link BaseQuery#_spawn}
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
    if (this._limit !== undefined) {
      this._validateSpawn(type, 'limit', [SelectQuery]);
    }
    return this._super.apply(this, arguments);
  },

  /**
   * Spawn a query using the table name binding that was provided when this
   * query was first created. The table name will be prepended to the list of
   * arguments for the spawn. This means that the type's `_create` method must
   * expect the first argument to be the table name (as is frequently the
   * case).
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Class} type The query type to use.
   * @param {Arguments} args The arguments to pass off.
   * @return {ChainedQuery} A new query of the given type.
   */
  _spawnBound: function(type, args) {
    args = Array.prototype.slice.call(args);
    args.unshift(this._table);
    return this._spawn(type, args);
  },

  /**
   * The same as {@link EntryQuery#select}, but you should omit the table name
   * argument as it will have already been bound.
   *
   * @since 1.0
   * @public
   * @method
   * @return {SelectQuery} The newly configured query.
   * @see {@link Model}
   * @see {@link Manager}
   */
  all: function() { return this._spawnBound(SelectQuery, arguments); },

  /**
   * The same as {@link EntryQuery#delete}, but you should omit the table name
   * argument as it will have already been bound.
   *
   * @since 1.0
   * @public
   * @method
   * @return {DeleteQuery} The newly configured query.
   * @see {@link Model}
   * @see {@link Manager}
   */
  delete: function() { return this._spawnBound(DeleteQuery, arguments); },

  /**
   * The same as {@link EntryQuery#udpate}, but you should omit the table name
   * argument as it will have already been bound.
   *
   * @since 1.0
   * @public
   * @method
   * @return {UpdateQuery} The newly configured query.
   * @see {@link Model}
   * @see {@link Manager}
   */
  update: function() { return this._spawnBound(UpdateQuery, arguments); },

  /**
   * The same as {@link EntryQuery#insert}, but you should omit the table name
   * argument as it will have already been bound.
   *
   * @since 1.0
   * @public
   * @method
   * @return {InsertQuery} The newly configured query.
   * @see {@link Model}
   * @see {@link Manager}
   */
  insert: function() { return this._spawnBound(InsertQuery, arguments); },

  /**
   * The same as {@link EntryQuery#raw}, but you should omit the table name
   * argument as it will have already been bound.
   *
   * @since 1.0
   * @public
   * @method
   * @return {RawQuery} The newly configured query.
   * @see {@link Model}
   * @see {@link Manager}
   */
  raw: function() { return this._spawn(RawQuery, arguments); },

  /**
   * If executed directly, this works as a select query.
   * Override of {@link BaseQuery#sql}.
   *
   * @private
   * @see {@link BaseQuery#sql}
   */
  sql: function() {
    return this.all().sql();
  }

});

module.exports = BoundQuery.reopenClass({ __name__: 'BoundQuery' });
