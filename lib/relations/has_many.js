'use strict';

var _ = require('lodash');
var util = require('util');
var property = require('../util/property').fn;
var BaseRelation = require('./base');

_.str = require('underscore.string');


/**
 * The has many property for models.
 *
 * Documentation forthcoming.
 *
 * For example:
 *
 *     var User = Model.extend({
 *       articles: hasMany('articles')
 *     });
 *
 * @since 1.0
 * @public
 * @constructor HasMany
 * @extends BaseRelation
 */
var HasMany = BaseRelation.extend(/** @lends HasMany# */ {
  init: function(name, modelClass, relatedModel, options) {
    this._super(name, modelClass);
    this._relatedModel = relatedModel;
    this._options = options || {};
    this._collectionCacheKey = '_' + this._name;
    this._objectsQueryCacheKey =
      '_' + _.str.camelize(this._name + '_objectsQueryCache');
  },

  /**
   * Get the inverse of this relation.
   *
   * Access the option that was given or calculate the value based on the
   * current model class name. The resulting value will be locked in after the
   * first call to avoid any possible changes due to changing state outside of
   * the relation.
   *
   * @since 1.0
   * @private
   * @type {String}
   */
  inverse: property(function() {
    if (!this._inverse) {
      // using underscored ensures that the class name is properly lowercased
      var modelNameUnderscored = _.str.underscored(this._modelClass.__name__);
      this._inverse = this._options.inverse ||
        _.str.camelize(modelNameUnderscored);
    }
    return this._inverse;
  }),

  /**
   * Get the primary key for this relation.
   *
   * Access the option that was given or calculate the value based on the
   * current model class name. The resulting value will be locked in after the
   * first call to avoid any possible changes due to changing state outside of
   * the relation.
   *
   * @since 1.0
   * @private
   * @type {String}
   */
  primaryKey: property(function() {
    if (!this._primaryKey) {
      this._primaryKey = this._options.primaryKey || 'id';
    }
    return this._primaryKey;
  }),

  /**
   * Get the foreign key for this relation.
   *
   * Access the option that was given or calculate the value based on the
   * current model class name. The resulting value will be locked in after the
   * first call to avoid any possible changes due to changing state outside of
   * the relation.
   *
   * @since 1.0
   * @private
   * @type {String}
   */
  foreignKey: property(function() {
    if (!this._foreignKey) {
      this._foreignKey = this._options.foreignKey ||
        _.str.underscored(this.inverse + '_id');
    }
    return this._foreignKey;
  })
});

/**
 * This wrapper method is used to immediately invalidate the `objectsQuery`
 * cache when performing any sort of update to related objects.
 *
 * The resulting wrapper function expects to be called with the first argument
 * being the model instance on which it is operating. It will use this to
 * invalidate the `objectsQuery` cache. It also expects that it will be used as
 * an instance method on a `HasMany` relation.
 *
 * @since 1.0
 * @private
 * @method HasMany~invalidatesQuery
 * @param {Function} fn The function to wrap.
 * @return {Function} The wrapper function.
 * @see {@link HasMany#_cacheObjectsQuery}
 */
var invalidatesQuery = function(fn) {
  return function(instance) {
    this._cacheObjectsQuery(instance, undefined);
    return fn.apply(this, arguments);
  };
};

HasMany.reopen(/** @lends HasMany# */ {

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @private
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @return {Promise} A promise that resolves when the update has finished.
   */
  _updateRelatedObjects: function(instance, value, relatedObjects) {
    var foreignKey = this.foreignKey;
    var foreignKeyProperty = _.str.camelize(this.foreignKey);
    var inverse = this.inverse;
    var relatedIds = _.map(relatedObjects, 'id');
    var id = value ? value.id : undefined;

    var updates = _.object([[foreignKey, id]]);
    var conditions = {};
    if (relatedIds.length === 1) { conditions.id = relatedIds[0]; }
    else { conditions['id[in]'] = relatedIds; }

    var query = this._relatedModel.objects;
    return query.where(conditions).update(updates).on('result', function() {
      relatedObjects.forEach(function(addition) {
        // TODO: write tests for the following cases:
        //   1. when related object (Article) has no belongsTo/attr for the
        //      foreign key property (authorId) that it still sets the
        //      database attribute (author_id)
        //   2. when the related object (Article) has defined a belongsTo or
        //      some sort of property for the inverse, that property does in
        //      fact get set.
        //   3. when the related object (Article) has defined an attr or some
        //      sort of property for the foreignKey, that property does in fact
        //      get set.
        //   4. the order for setting values is db attribute, foreign key
        //      property, inverse property.
        addition.attrs[foreignKey] = id;
        addition[foreignKeyProperty] = id;
        addition[inverse] = value;
      });
    }).execute();
  },

  /**
   * The identity property for this relation.
   *
   * This property allows access to the underlying relation object, allowing
   * you to access details about how the relation was created/configured. This
   * method is currently only intended for internal use, but if you have a
   * reason for it to be documented publicly, please create an issue on GitHub
   * and let us know.
   *
   * It is accessible on an individual model via `<plural>Relation`. For
   * instance, a user that has many articles would cause this method to get
   * triggered via `user.articlesRelation`.
   *
   * The naming conventions are set forth in {@link HasMany.methods}.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  identity: function(/*instance*/) {
    return this;
  },

  /**
   * The collection property for this relation.
   *
   * This property allows access to the cached objects that have been fetched
   * for a specific model in a given relation. Before the cache has been
   * filled, accessing this property will throw an exception.
   *
   * It is accessible on an individual model via `<plural>`. For
   * instance, a user that has many articles would cause this method to get
   * triggered via `user.articles`.
   *
   * The naming conventions are set forth in {@link HasMany.methods}.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  collection: function(instance) {
    var result;
    var cacheName = this._collectionCacheKey;
    if (instance[cacheName]) { result = instance[cacheName]; }
    else {
      throw new Error(util.format('The relation "%s" has not yet been ' +
        'loaded.', this._name));
    }
    return result;
  },

  /**
   * Update the {@link HasMany#collection} cache to contain a new value.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} value The new value for the collection cache.
   */
  _cacheCollection: function(instance, value) {
    instance[this._collectionCacheKey] = value;
  },

  /**
   * Alter the {@link HasMany#collection} cache if it's been loaded. This
   * method exists to allow easy addition/removal of objects from the cache.
   * The transformation function simply takes the current value of the cache
   * and returns a new value that should be stored as the cache contents.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Function} A function to alter the cache.
   */
  _alterCollectionCache: function(instance, fn) {
    var value = instance[this._collectionCacheKey];
    if (value) { this._cacheCollection(instance, fn(value)); }
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
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  objectsQuery: function(instance) {
    var cacheName = this._objectsQueryCacheKey;
    if (!instance[cacheName]) {
      var where = _.object([[this.foreignKey, instance[this.primaryKey]]]);
      var cacheResult = _.bind(this._cacheCollection, this, instance);
      instance[cacheName] = this._relatedModel
        .objects.where(where)
        .on('result', cacheResult);
    }
    return instance[cacheName];
  },

  /**
   * Update the {@link HasMany#objectsQuery} cache to contain a new value.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Object} value The new value.
   */
  _cacheObjectsQuery: function(instance, value) {
    instance[this._objectsQueryCacheKey] = value;
  },

  /**
   * The create object method for this relation.
   *
   * This simply creates a new object that has the appropriate relation data
   * already set.
   *
   * This method invalidates the {@link HasMany#objectsQuery} cache and adds
   * the created object to the {@link HasMany#collection} (if loaded).
   *
   * It is accessible on an individual model via `create<Singular>`. For
   * instance, a user that has many articles would cause this method to get
   * triggered via `user.createArticle`.
   *
   * The naming conventions are set forth in {@link HasMany.methods}.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} args The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  createObject: invalidatesQuery(function(instance, args) {
    var foreignKeyProperty = _.str.camelize(this.foreignKey);
    var inverse = this.inverse;
    var relatedModel = this._relatedModel;
    var result = relatedModel.create.apply(relatedModel, args);
    // TODO: write tests for the following cases:
    //   1. when related object (Article) has no belongsTo/attr for the
    //      foreign key property (authorId) that it still sets the
    //      database attribute (author_id)
    //   2. when the related object (Article) has defined a belongsTo or
    //      some sort of property for the inverse, that property does in
    //      fact get set.
    //   3. when the related object (Article) has defined an attr or some
    //      sort of property for the foreignKey, that property does in fact
    //      get set.
    //   4. the order for setting values is db attribute, foreign key
    //      property, inverse property.
    result.attrs[this.foreignKey] = instance.id;
    result[foreignKeyProperty] = instance.id;
    result[inverse] = instance;

    // add the created object to the collection cache (if it exists)
    var unionCreatedObjects = _.partialRight(_.union, [result]);
    this._alterCollectionCache(instance, unionCreatedObjects);

    return result;
  }),

  /**
   * The add objects method for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery} cache and adds
   * the related objects to the {@link HasMany#collection} (if loaded).
   *
   * It is accessible on an individual model via `add<Singular>` and
   * `add<Plural>`. For instance a user that has many articles would cause this
   * method to get triggered via `user.addArticle` or `user.addArticles`.
   *
   * The naming conventions are set forth in {@link HasMany.methods}.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} args The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  addObjects: invalidatesQuery(function(instance, args) {
    var objects = _.flatten(args, true);
    return this._updateRelatedObjects(instance, instance, objects)
      .tap(this._afterAddingObjects.bind(this, instance, objects));
  }),

  /**
   * Actions to perform after successfully adding objects.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The added objects.
   */
  _afterAddingObjects: function(instance, objects) {
    var unionAddedObjects = _.partialRight(_.union, objects);
    this._alterCollectionCache(instance, unionAddedObjects);
  },

  /**
   * The remove objects method for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery} cache and removes
   * the related objects from the {@link HasMany#collection} (if loaded).
   *
   * It is accessible on an individual model via `remove<Singular>` and
   * `remove<Plural>`. For instance a user that has many articles would cause
   * this method to get triggered via `user.removeArticle` or
   * `user.removeArticles`.
   *
   * The naming conventions are set forth in {@link HasMany.methods}.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} args The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  removeObjects: invalidatesQuery(function(instance, args) {
    var objects = _.flatten(args, true);
    return this._updateRelatedObjects(instance, undefined, objects)
      .tap(this._afterRemovingObjects.bind(this, instance, objects));
  }),

  /**
   * Actions to perform after successfully removing objects.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The removed objects.
   */
  _afterRemovingObjects: function(instance, objects) {
    var differenceRemovedObjects = _.partialRight(_.difference, objects);
    this._alterCollectionCache(instance, differenceRemovedObjects);
  },

  /**
   * The clear objects method for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery} cache and removes
   * all objects from the {@link HasMany#collection} (if loaded).
   *
   * It is accessible on an individual model via `clear<Plural>`. For
   * instance, a user that has many articles would cause this method to get
   * triggered via `user.clearArticles`.
   *
   * The naming conventions are set forth in {@link HasMany.methods}.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} args The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  clearObjects: invalidatesQuery(function(instance/*, args*/) {
    var where = _.object([[this.foreignKey, instance[this.primaryKey]]]);
    var query = this._relatedModel.objects.where(where);
    return query.delete().execute()
      .tap(this._afterClearingObjects.bind(this, instance));
  }),

  /**
   * Actions to perform after successfully clearing objects.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   */
  _afterClearingObjects: function(instance) {
    this._alterCollectionCache(instance, function() { return []; });
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  prefetch: function(instances) {
    if (instances.length === 0) { return; }

    var self = this;
    var queryKey = this.foreignKey;
    var pks = _.map(instances, this.primaryKey);

    if (instances.length === 1) { pks = pks[0]; }
    else { queryKey += '[in]'; }

    var where = _.object([[queryKey, pks]]);
    var query = this._relatedModel.objects.where(where);

    return query.execute().then(function(related) {
      var grouped = _.groupBy(related, function(item) {
        return item.attrs[self.foreignKey];
      });
      instances.forEach(function(instance) {
        var pk = instance[self.primaryKey];
        var cacheName = self._collectionCacheKey;
        var results = grouped[pk] || [];
        instance[cacheName] = results;
      });
    });
  }
});

HasMany.reopenClass(/** @lends HasMany */ {

  /**
   * Naming conventions for `HasMany` relations.
   *
   * @since 1.0
   * @private
   * @type {Object}
   * @see {@link BaseRelation#methods}
   */
  methods: {
    '<plural>': BaseRelation.property('collection'),
    '<plural>Relation': BaseRelation.property('identity'),
    '<singular>Objects': BaseRelation.property('objectsQuery'),
    'create<Singular>': BaseRelation.method('createObject'),
    'add<Singular>': BaseRelation.method('addObjects'),
    'add<Plural>': BaseRelation.method('addObjects'),
    'remove<Singular>': BaseRelation.method('removeObjects'),
    'remove<Plural>': BaseRelation.method('removeObjects'),
    'clear<Plural>': BaseRelation.method('clearObjects')
  }

});

module.exports = HasMany.reopenClass({ __name__: 'HasMany' });
