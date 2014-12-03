'use strict';

var _ = require('lodash');
var util = require('util');
var property = require('../util/property').fn;
var BluebirdPromise = require('bluebird');
var BaseRelation = require('./base');
var Actionable = require('../util/actionable');

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
 * @param {Class|String} [relatedModel] The model to which this relates.
 * @param {Object} [options]
 * @param {String} [options.inverse] The name of the inverse relationship.
 * @param {String} [options.primaryKey] The name of the primary key in the
 * relationship.
 * @param {String} [options.foreignKey] The name of the foreign key in the
 * relationship.
 * @function Database#hasMany
 */

/**
 * The has many property for models.
 *
 * @since 1.0
 * @protected
 * @constructor HasMany
 * @extends BaseRelation
 * @see {@link Database#hasMany}
 */
var HasMany = BaseRelation.extend(/** @lends HasMany# */ {
  init: function() {
    this._super.apply(this, arguments);
    this._collectionCacheKey = '_' + this._name;
    this._inFlightDataKey =
      '_' + _.str.camelize(this._name + '_objectsInFlight');
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
   * @return {Promise} A promise that resolves when the prep work has finished.
   */
  _prepareForForeignKeyUpdate: function(instance, relatedObjects) {
    var foreignKey = this.foreignKey;
    return BluebirdPromise.map(relatedObjects, function(obj) {
      var dirty = _.without(obj.dirtyAttributes, foreignKey);
      var save = dirty.length || !obj.persisted;
      return save && obj.save();
    });
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @private
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @return {Promise} A promise that resolves when the update has finished.
   */
  _updateForeignKeys: function(instance, relatedObjects, id) {
    if (!_.any(relatedObjects, 'dirty')) { return BluebirdPromise.bind(); }

    var foreignKey = this.foreignKey;
    var relatedIds = _.map(relatedObjects, 'id');

    var updates = _.object([[foreignKey, id]]);
    var conditions = {};
    if (relatedIds.length === 1) { conditions.id = relatedIds[0]; }
    else { conditions['id[in]'] = relatedIds; }

    var query = this._relatedModel.objects;
    return query.where(conditions).update(updates).execute();
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
    var result = instance[this._collectionCacheKey];
    if (!result) {
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
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  _getInFlightData: function(instance) {
    return _.defaults({}, instance[this._inFlightDataKey], {
      clear: false,
      add: [],
      remove: []
    });
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  _setInFlightData: function(instance, data) {
    instance[this._inFlightDataKey] = data;
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
      var where = _.object([[this.foreignKey, instance.attrs[this.primaryKey]]]);
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
    var relatedModel = this._relatedModel;
    var result = relatedModel.create.apply(relatedModel, args);

    this.associate(instance, result);

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
   * @return {Actionable} A thenable object, use of which will trigger the
   * instance to be saved.
   * @see {@link BaseRelation#methods}
   */
  addObjects: invalidatesQuery(function(instance, args) {
    var objects = _.flatten(args, true);
    this._beforeAddingObjects(instance, objects);
    return Actionable.create(instance.save.bind(instance));
  }),

  /**
   * Perform the necessary updates to add objects for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery}.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} objects The objects to add to the relationship.
   * @see {@link BaseRelation#methods}
   */
  _performAdd: invalidatesQuery(function(instance, objects) {
    var self = this;
    return self._prepareForForeignKeyUpdate(instance, objects)
    .then(function() {
      return self._updateForeignKeys(instance, objects, instance.id);
    });
  }),

  /**
   * Actions to perform before successfully adding objects.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The added objects.
   */
  _beforeAddingObjects: function(instance, objects) {
    // TODO: combine this functionality... make associate handle multiple?
    objects.forEach(function(relatedObject) {
      this.associate(instance, relatedObject);
    }, this);
    var unionAddedObjects = _.partialRight(_.union, objects);
    this._alterCollectionCache(instance, unionAddedObjects);

    var data = this._getInFlightData(instance);

    var noLongerRemoved = _.intersection(objects, data.remove);
    var stillNeedAdding = _.difference(objects, noLongerRemoved);
    data.remove = _.difference(data.remove, noLongerRemoved);
    data.add = _.union(data.add, stillNeedAdding);

    this._setInFlightData(instance, data);
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
   * @return {Actionable} A thenable object, use of which will trigger the
   * instance to be saved.
   * @see {@link BaseRelation#methods}
   */
  removeObjects: invalidatesQuery(function(instance, args) {
    var objects = _.flatten(args, true);
    this._beforeRemovingObjects(instance, objects);
    return Actionable.create(instance.save.bind(instance));
  }),

  /**
   * Perform the necessary updates to remove objects for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery}.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} objects The objects to remove from the relationship.
   * @see {@link BaseRelation#methods}
   */
  _performRemove: invalidatesQuery(function(instance, objects) {
    var self = this;
    var removable = _.filter(objects, 'persisted');
    return self._prepareForForeignKeyUpdate(instance, removable)
    .then(function() {
      return self._updateForeignKeys(instance, removable, undefined);
    });
  }),

  /**
   * Actions to perform before successfully removing objects.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The removed objects.
   */
  _beforeRemovingObjects: function(instance, objects) {
    // TODO: combine this functionality... make disassociate handle multiple?
    objects.forEach(function(relatedObject) {
      this.disassociate(instance, relatedObject);
    }, this);
    var differenceRemovedObjects = _.partialRight(_.difference, objects);
    this._alterCollectionCache(instance, differenceRemovedObjects);

    var data = this._getInFlightData(instance);

    var noLongerAdded = _.intersection(objects, data.add);
    var stillNeedRemoving = _.difference(objects, noLongerAdded);
    data.add = _.difference(data.add, noLongerAdded);
    data.remove = _.union(data.remove, stillNeedRemoving);

    this._setInFlightData(instance, data);
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
   * @return {Actionable} A thenable object, use of which will trigger the
   * instance to be saved.
   * @see {@link BaseRelation#methods}
   */
  clearObjects: invalidatesQuery(function(instance/*, args*/) {
    this._beforeClearingObjects(instance);
    this._setInFlightData(instance, { clear: true, add: [], remove: [] });
    return Actionable.create(instance.save.bind(instance));
  }),

  /**
   * Perform the necessary updates to clear objects for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery}.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  _performClear: invalidatesQuery(function(instance/*, args*/) {
    var updates = _.object([[this.foreignKey, undefined]]);
    var query = this.objectsQuery(instance).update(updates);
    return query.execute();
  }),

  /**
   * Actions to perform before successfully clearing objects.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   */
  _beforeClearingObjects: function(instance) {
    this._alterCollectionCache(instance, function() { return []; });
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  associate: function(instance, relatedObject, options) {
    var inverse;
    var opts = _.defaults({}, options, {
      follow: true
    });
    if (opts.follow) {
      inverse = relatedObject[this.inverse + 'Relation'];
    }

    // TODO: write tests for the following cases:
    //   4. the order for setting values is db attribute before inverse property.

    // always set foreign key in case the inverse relation does not exist
    relatedObject.setAttribute(this.foreignKey, instance.id);

    // add the object to the collection cache (if it exists)
    var unionObjects = _.partialRight(_.union, [relatedObject]);
    this._alterCollectionCache(instance, unionObjects);

    if (inverse) {
      inverse.associate(relatedObject, instance, { follow: false });
    }
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  disassociate: function(instance, relatedObject, options) {
    var inverse;
    var opts = _.defaults({}, options, {
      follow: true
    });
    if (opts.follow) {
      inverse = relatedObject[this.inverse + 'Relation'];
    }

    // always set foreign key in case the inverse relation does not exist
    relatedObject.setAttribute(this.foreignKey, undefined);

    if (inverse) {
      inverse.disassociate(relatedObject, instance, { follow: false });
    }
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
  },

  /**
   * Override of the model's init method.
   *
   * This allows the relation to create a collection cache when new instances
   * are created (those that are not loaded).
   *
   * During the process of creating the model, it checks to see if it was
   * loaded from the database & if it was not, it is assumed to be a brand new
   * object that could not have any associations. It therefore fills the
   * collection cache with an empty array.
   *
   * It is accessible on an individual model via `init`, and as such is an
   * override of the builtin init method.
   *
   * As with all other relation methods, the naming conventions are set forth
   * in {@link BelongsTo.methods}.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} args The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  initialize: function(instance, args) {
    instance._super.apply(instance, args);
    if (!instance.persisted) {
      this._cacheCollection(instance, []);
    }
  },

  /**
   * Override of the model's save method.
   *
   * This allows the relation to save related objects & update the database to
   * reflect the associations in response to the instance on which it is
   * operating being saved.
   *
   * During the process of saving the related object, it uses the combined
   * results from calls to {@link HasMany#addObjects},
   * {@link HasMany#removeObjects}, and {@link HasMany#clearObjects} to
   * determine what actions need to be taken, then perform updates accordingly.
   *
   * It is accessible on an individual model via `save`, and as such is an
   * override of the builtin save method.
   *
   * As with all other relation methods, the naming conventions are set forth
   * in {@link HasMany.methods}.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} args The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  save: function(instance, args) {
    var _super = instance._super;
    var self = this;
    var promise = BluebirdPromise.bind();
    var data = this._getInFlightData(instance);

    if (data.clear) {
      promise = promise.then(function() {
        return self._performClear(instance);
      });
    }

    if (data.add || data.remove) {
      promise = promise.then(function() {
        return [
          self._performAdd(instance, data.add),
          self._performRemove(instance, data.remove)
        ];
      })
      .all();
    }

    return promise.then(function() {
      return _super.apply(instance, args);
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
    'clear<Plural>': BaseRelation.method('clearObjects'),
    'init': BaseRelation.method('initialize'),
    'save': BaseRelation.method('save')
  }

});

module.exports = HasMany.reopenClass({ __name__: 'HasMany' });
