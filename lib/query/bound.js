'use strict';

var _ = require('lodash');
var SelectQuery = require('./select');
var InsertQuery = require('./insert');
var UpdateQuery = require('./update');
var DeleteQuery = require('./delete');
var RawQuery = require('./raw');

var EntryQuery = require('maguey').EntryQuery;
var Core = require('./mixins/bound_core');
var Helpers = require('./mixins/bound_helpers');
var With = require('./mixins/bound_with');
var Unique = require('./mixins/bound_unique');
var Join = require('./mixins/bound_join');
var AutoJoin = require('./mixins/bound_auto_join');
var FieldTransform = require('./mixins/bound_transform');


/**
 * A query bound to a specific model class.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link EntryQuery#bind}.
 *
 * @protected
 * @constructor BoundQuery
 * @extends SelectQuery
 */
var BoundQuery = SelectQuery.extend();

BoundQuery.reopen(Core);
BoundQuery.reopen(Helpers);
BoundQuery.reopen(With);
BoundQuery.reopen(Unique);
BoundQuery.reopen(Join);
BoundQuery.reopen(AutoJoin);
BoundQuery.reopen(FieldTransform);

SelectQuery.reopen(Core);
SelectQuery.reopen(Helpers);
SelectQuery.reopen(With);
SelectQuery.reopen(Unique);
SelectQuery.reopen(Join);
SelectQuery.reopen(AutoJoin);
SelectQuery.reopen(FieldTransform);

InsertQuery.reopen(Core);
InsertQuery.reopen(Helpers);
InsertQuery.reopen(FieldTransform);

UpdateQuery.reopen(Core);
UpdateQuery.reopen(Helpers);
UpdateQuery.reopen(FieldTransform);

DeleteQuery.reopen(Core);
DeleteQuery.reopen(Helpers);
DeleteQuery.reopen(FieldTransform);


BoundQuery.reopen(/** @lends BoundQuery# */ {
  init: function() { throw new Error('BoundQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @param {Class} model The model class to lock in / bind to this query.
   * @see {@link BaseQuery#_create}
   */
  _create: function(model) {
    this._super(model.tableName);
    this._model = model;
    this._modelTable = model.tableName; // save in case query is unbound
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
    if (_.size(this._joins)) {
      this._validateSpawn(type, 'join', [SelectQuery]);
    }
    if (this._groupBy) {
      this._validateSpawn(type, 'groupBy', [SelectQuery]);
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
    args.unshift(this._modelTable);
    return this._spawn(type, args);
  },

  /**
   * The same as {@link EntryQuery#select}, but you should omit the table name
   * argument as it will have already been bound. Also, unlike
   * {@link BoundQuery#select}, this will only allow selecting all columns.
   *
   * @method
   * @public
   * @return {SelectQuery} The newly configured query.
   * @see {@link Model}
   * @see {@link Manager}
   */
  all: function() {
    return this._spawnBound(SelectQuery, []);
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
  select: function() {
    return this._spawnBound(SelectQuery, arguments).noload();
  },

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
  delete: function() {
    return this._spawnBound(DeleteQuery, arguments).noload();
  },

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
  update: function() {
    return this._spawnBound(UpdateQuery, arguments).noload();
  },

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
  insert: function() {
    return this._spawnBound(InsertQuery, arguments).noload();
  },

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
   * Convenience method for finding objects by primary key. Essentially, this
   * just does the following:
   *
   *     query.where({ pk: pk }).limit(1).fetchOne()
   *
   * @method
   * @public
   * @param {Integer|?} pk The primary key of the object to find.
   * @return {Promise} A promise resolves with the found object.
   */
  find: function(pk) {
    return this.where({ pk: pk }).limit(1).fetchOne();
  },

  /**
   * Convenience method for finding an object & creating it if it doesn't
   * exist. Essentially, this just does the following:
   *
   *     Model.where(attributes).limit(1).fetchOne()
   *     .catch(function(e) {
   *       if (e.code !== 'NO_RESULTS_FOUND') { throw e; }
   *       return Model.create(attributes).save();
   *     });
   *
   * @param {Object} attributes The attributes of the object to find or create.
   * @param {Object} defaults Additional attributes to set if the object needs
   * to be created.
   * @return {Promise} A promise resolves with the found or created object.
   */
  findOrCreate: function(attributes, defaults) {
    return this.where(attributes).limit(1).fetchOne()
    .catch(function(e) {
      if (e.code !== 'NO_RESULTS_FOUND') { throw e; }
      return this._model.create(_.extend({}, attributes, defaults)).save();
    }.bind(this));
  },

});

EntryQuery.reopen(/** @lends EntryQuery# */ {
  bind: function() { return this._spawn(BoundQuery, arguments); },
});

module.exports = BoundQuery.reopenClass({ __name__: 'BoundQuery' });
