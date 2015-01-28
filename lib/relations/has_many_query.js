'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');

/**
 * This helper method is used to immediately invalidate the `objectsQuery`
 * cache when performing any sort of update to related objects.
 *
 * The method expects to be called with the first argument being the model
 * instance on which it is operating. It will use this to invalidate the
 * `objectsQuery` cache. It also expects that it will be used as an instance
 * method on a `HasMany` relation.
 *
 * @method HasMany~invalidateQuery
 * @private
 * @see {@link HasMany#_cacheObjectsQuery}
 */
var invalidateQuery = function(instance) {
  this._cacheObjectsQuery(instance, undefined);
  this._super.apply(this, arguments);
};

/**
 * HasMany mixin for they query object.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends HasMany# */ {

  init: function() {
    this._super.apply(this, arguments);
    this._objectsQueryCacheKey =
      '_' + _.camelCase(this._name + '_objectsQueryCache');
  },

  /**
   * Update the {@link HasMany#objectsQuery} cache to contain a new value.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Object} value The new value.
   */
  _cacheObjectsQuery: function(instance, value) {
    instance[this._objectsQueryCacheKey] = value;
  },

  /**
   * The objects query property for this relation.
   *
   * This property allows you access to a query which you can use to fetch all
   * objects for a relation on a given model and/or to configure the query to
   * fetch a subset of the related objects.
   *
   * When you fetch all objects, the resulting objects will be cached and
   * accessible via the {@link HasMany#collection} (if loaded).
   *
   * The value of this property is a query object that is cached so it will
   * always be the exact same query object (see exceptions below). This allows
   * multiple fetches to simply return the query's cached result. A simple
   * {@link BaseQuery#clone} of the query will ensure that it is always
   * performing a new query in the database.
   *
   * The cache of this property will be invalided (and the resulting object a
   * new query object) when changes are made to the relation.
   *
   * It is accessible on an individual model via `<singular>Objects`. For
   * instance, a user that has many articles would cause this method to get
   * triggered via `user.articleObjects`.
   *
   * The naming conventions are set forth in {@link HasMany.methods}.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  objectsQuery: function(instance) {
    var cacheName = this._objectsQueryCacheKey;
    if (!instance[cacheName]) {
      var associateResult = _.bind(this.associateFetchedObjects, this, instance);
      instance[cacheName] = this
        .scopeObjectQuery(instance, this._relatedModel.objects)
        .on('result', associateResult);
    }
    return instance[cacheName];
  },

  /**
   * Scoping for object queries.
   *
   * Mixins can override {@link HasMany#scopeObjectQuery} to apply a more
   * specific scope for the search of objects. This is the default
   * implementation.
   *
   * @param {Model} instance The model instance on which to operate.
   * @param {ChainedQuery} query The query to scope.
   * @return {ChainedQuery} The newly configured query.
   */
  _scopeObjectQuery: function(instance, query) {
    var where = _.object([[
      this.foreignKey, instance.getAttribute(this.primaryKey)
    ]]);
    return query.where(where);
  },

  /**
   * Implementation of {@link HasMany#beforeCreatingObject} for invalidating
   * the query cache.
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeCreatingObject}
   */
  beforeCreatingObject: invalidateQuery,

  /**
   * Implementation of {@link HasMany#beforeAddingObjects} for invalidating the
   * query cache.
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeAddingObjects}
   */
  beforeAddingObjects: invalidateQuery,

  /**
   * Implementation of {@link HasMany#afterAddingObjects} for invalidating the
   * query cache.
   *
   * @method
   * @protected
   * @see {@link HasMany#afterAddingObjects}
   */
  afterAddingObjects: invalidateQuery,

  /**
   * Implementation of {@link HasMany#beforeRemovingObjects} for invalidating
   * the query cache.
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeRemovingObjects}
   */
  beforeRemovingObjects: invalidateQuery,

  /**
   * Implementation of {@link HasMany#afterRemovingObjects} for invalidating
   * the query cache.
   *
   * @method
   * @protected
   * @see {@link HasMany#afterRemovingObjects}
   */
  afterRemovingObjects: invalidateQuery,

  /**
   * Implementation of {@link HasMany#beforeClearingObjects} for invalidating
   * the query cache.
   *
   * @method
   * @protected
   * @see {@link HasMany#beforeClearingObjects}
   */
  beforeClearingObjects: invalidateQuery,

  /**
   * Implementation of {@link HasMany#afterClearingObjects} for invalidating
   * the query cache.
   *
   * @method
   * @protected
   * @see {@link HasMany#afterClearingObjects}
   */
  afterClearingObjects: invalidateQuery,

});
