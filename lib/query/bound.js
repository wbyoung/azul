'use strict';

var _ = require('lodash');
var BaseQuery = require('./base');
var SelectQuery = require('./select');
var InsertQuery = require('./insert');
var UpdateQuery = require('./update');
var DeleteQuery = require('./delete');
var RawQuery = require('./raw');
var Fetch = require('./mixins/fetch');
var Where = require('./mixins/where');
var Limit = require('./mixins/limit');
var Order = require('./mixins/order');
var Join = require('./mixins/join');
var GroupBy = require('./mixins/group_by');

/**
 * A bound query.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link EntryQuery#bind}.
 *
 * @protected
 * @constructor BoundQuery
 * @extends BaseQuery
 * @mixes Where
 */
var BoundQuery = BaseQuery.extend();

BoundQuery.reopen(Fetch);
BoundQuery.reopen(Where);
BoundQuery.reopen(Limit);
BoundQuery.reopen(Order);
BoundQuery.reopen(Join);
BoundQuery.reopen(GroupBy);

BoundQuery.reopen(/** @lends BoundQuery# */ {
  init: function() { throw new Error('BoundQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
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
   * @method
   * @protected
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._table = orig._table;
  },

  /**
   * Validate a spawn to ensure that it is in a set of allowed types.
   *
   * @method
   * @protected
   * @param {Class} type The type of spawn being performed.
   * @param {String} operation The operation being performed (this is only used
   * as part of the error message if the validation fails).
   * @param {Array.<Class>} allowed An array of allowed types. If the type is
   * not one of these (or derives from one of these), then the validation
   * fails.
   */
  _validateSpawn: function(type, operation, allowed) {
    var isAllowed = _.any(allowed, function(allowedType) {
      return type instanceof allowedType.__metaclass__;
    });
    if (!isAllowed) {
      var name = type.__name__.replace(/Query$/, '').toLowerCase();
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
   * @method
   * @private
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
    if (this._joins.length) {
      this._validateSpawn(type, 'join', [SelectQuery]);
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
   * @method
   * @protected
   * @param {Class} type The query type to use.
   * @param {Arguments} args The arguments to pass off.
   * @return {ChainedQuery} A new query of the given type.
   */
  _spawnBound: function(type, args) {
    args = _.toArray(args);
    args.unshift(this._table);
    return this._spawn(type, args);
  },

  /**
   * The same as {@link EntryQuery#select}, but you should omit the table name
   * argument as it will have already been bound.
   *
   * @method
   * @public
   * @return {SelectQuery} The newly configured query.
   * @see {@link Model}
   * @see {@link Manager}
   */
  all: function() { return this._spawnBound(SelectQuery, arguments); },

  /**
   * The same as {@link EntryQuery#delete}, but you should omit the table name
   * argument as it will have already been bound.
   *
   * @method
   * @public
   * @return {DeleteQuery} The newly configured query.
   * @see {@link Model}
   * @see {@link Manager}
   */
  delete: function() { return this._spawnBound(DeleteQuery, arguments); },

  /**
   * The same as {@link EntryQuery#udpate}, but you should omit the table name
   * argument as it will have already been bound.
   *
   * @method
   * @public
   * @return {UpdateQuery} The newly configured query.
   * @see {@link Model}
   * @see {@link Manager}
   */
  update: function() { return this._spawnBound(UpdateQuery, arguments); },

  /**
   * The same as {@link EntryQuery#insert}, but you should omit the table name
   * argument as it will have already been bound.
   *
   * @method
   * @public
   * @return {InsertQuery} The newly configured query.
   * @see {@link Model}
   * @see {@link Manager}
   */
  insert: function() { return this._spawnBound(InsertQuery, arguments); },

  /**
   * The same as {@link EntryQuery#raw}, but you should omit the table name
   * argument as it will have already been bound.
   *
   * @method
   * @public
   * @return {RawQuery} The newly configured query.
   * @see {@link Model}
   * @see {@link Manager}
   */
  raw: function() { return this._spawn(RawQuery, arguments); },

  /**
   * If executed directly, this works as a select query.
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    return this.all().statement;
  }

});

module.exports = BoundQuery.reopenClass({ __name__: 'BoundQuery' });
