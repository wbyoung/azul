'use strict';

var _ = require('lodash');
var util = require('util');
var BluebirdPromise = require('bluebird');
var BaseRelation = require('./base');
var Actionable = require('../util/actionable');
var Config = require('./has_many_config');
var Associations = require('./has_many_associations');
var Prefetch = require('./has_many_prefetch');

_.str = require('underscore.string');


/**
 * The has many relation for models.
 *
 * For example:
 *
 *     var User = Model.extend({
 *       articles: hasMany('articles')
 *     });
 *
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
 * The has many relation for models.
 *
 * @protected
 * @constructor HasMany
 * @extends BaseRelation
 * @see {@link Database#hasMany}
 */
var HasMany = BaseRelation.extend();

HasMany.reopen(Config);
HasMany.reopen(Associations);
HasMany.reopen(Prefetch);

HasMany.reopen(/** @lends HasMany# */ {
  init: function() {
    this._super.apply(this, arguments);
    this._collectionCacheKey = '_' + this._name;
    this._inFlightDataKey =
      '_' + _.str.camelize(this._name + '_objectsInFlight');
    this._objectsQueryCacheKey =
      '_' + _.str.camelize(this._name + '_objectsQueryCache');
  },
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
   * Prepare many related objects for a foreign key update.
   *
   * This will save any dirty records unless the only attribute that is dirty
   * is the foreign key. It will also save any newly created objects regardless
   * of whether or not they are dirty.
   *
   * @private
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} relatedObjects The related models to prepare.
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
   * Update foreign keys for a set of related objects.
   *
   * This will update the foreign keys of several objects in a single query.
   * This allows much faster creation of associations at the database level.
   *
   * After a successful update, it will clean the foreign key attribute of
   * each updated object, likely leaving the object completely clean.
   *
   * @private
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} relatedObjects The related models on which to
   * update keys.
   * @param {?} id The id to use as the value of the foreign key.
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
    return query.where(conditions).update(updates).execute().then(function() {
      relatedObjects.forEach(function(obj) {
        obj.cleanAttribute(foreignKey);
      });
    });
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
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} value The new value for the collection cache.
   */
  _setCollectionCache: function(instance, value) {
    instance[this._collectionCacheKey] = value;
  },

  /**
   * Add to the {@link HasMany#collection} cache if it's been loaded.
   *
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} The objects to add.
   */
  _unionCollectionCache: function(instance, objects) {
    var value = instance[this._collectionCacheKey];
    if (value) {
      this._setCollectionCache(instance, _.union(value, objects));
    }
  },

  /**
   * Remove from the {@link HasMany#collection} cache if it's been loaded.
   *
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} The objects to remove.
   */
  _differenceCollectionCache: function(instance, objects) {
    var value = instance[this._collectionCacheKey];
    if (value) {
      this._setCollectionCache(instance, _.difference(value, objects));
    }
  },

  /**
   * Clear the {@link HasMany#collection} cache if it's been loaded.
   *
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   */
  _clearCollectionCache: function(instance) {
    var value = instance[this._collectionCacheKey];
    if (value) {
      this._setCollectionCache(instance, []);
    }
  },

  /**
   * @typedef {Object} HasMany~InFlightData
   * @property {Array.<Model>} add An array of objects to add to the
   * relationship.
   * @property {Array.<Model>} remove An array of objects to remove from the
   * relationship.
   * @property {Boolean} clear Whether or not the related objects should be
   * cleared entirely.
   */

  /**
   * Get in flight data, the information pertinent to this relation that has
   * not yet been saved.
   *
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @return {HasMany~InFlightData} In flight data.
   */
  _getInFlightData: function(instance) {
    return _.defaults({}, instance[this._inFlightDataKey], {
      clear: false,
      add: [],
      remove: []
    });
  },

  /**
   * Set the in flight.
   *
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {HasMany~InFlightData} data In flight data.
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
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  objectsQuery: function(instance) {
    var cacheName = this._objectsQueryCacheKey;
    if (!instance[cacheName]) {
      var where = _.object([[
        this.foreignKey, instance.getAttribute(this.primaryKey)
      ]]);
      var associateResult = _.bind(this.associateFetchedObjects, this, instance);
      instance[cacheName] = this._relatedModel
        .objects.where(where)
        .on('result', associateResult);
    }
    return instance[cacheName];
  },

  /**
   * Update the {@link HasMany#objectsQuery} cache to contain a new value.
   *
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
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  createObject: invalidatesQuery(function(instance) {
    var args = _.rest(arguments);
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
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   * @return {Actionable} A thenable object, use of which will trigger the
   * instance to be saved.
   * @see {@link BaseRelation#methods}
   */
  addObjects: invalidatesQuery(function(instance) {
    var args = _.rest(arguments);
    var objects = _.flatten(args, true);
    this.associateObjects(instance, objects);

    var data = this._getInFlightData(instance);
    var noLongerRemoved = _.intersection(objects, data.remove);
    var stillNeedAdding = _.difference(objects, noLongerRemoved);
    data.remove = _.difference(data.remove, noLongerRemoved);
    data.add = _.union(data.add, stillNeedAdding);
    this._setInFlightData(instance, data);

    return Actionable.create(instance.save.bind(instance));
  }),

  /**
   * Perform the necessary updates to add objects for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery}.
   *
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} objects The objects to add to the relationship.
   */
  _performAdd: invalidatesQuery(function(instance, objects) {
    var self = this;
    return self._prepareForForeignKeyUpdate(instance, objects)
    .then(function() {
      return self._updateForeignKeys(instance, objects, instance.id);
    })
    .then(function() {
      var data = self._getInFlightData(instance);
      data.add = _.difference(data.add, objects);
      self._setInFlightData(instance, data);
    });
  }),

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
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   * @return {Actionable} A thenable object, use of which will trigger the
   * instance to be saved.
   * @see {@link BaseRelation#methods}
   */
  removeObjects: invalidatesQuery(function(instance) {
    var args = _.rest(arguments);
    var objects = _.flatten(args, true);
    this.disassociateObjects(instance, objects);

    var data = this._getInFlightData(instance);
    var noLongerAdded = _.intersection(objects, data.add);
    var stillNeedRemoving = _.difference(objects, noLongerAdded);
    data.add = _.difference(data.add, noLongerAdded);
    data.remove = _.union(data.remove, stillNeedRemoving);
    this._setInFlightData(instance, data);

    return Actionable.create(instance.save.bind(instance));
  }),

  /**
   * Perform the necessary updates to remove objects for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery}.
   *
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} objects The objects to remove from the relationship.
   */
  _performRemove: invalidatesQuery(function(instance, objects) {
    var self = this;
    var removable = _.filter(objects, 'persisted');
    return self._prepareForForeignKeyUpdate(instance, removable)
    .then(function() {
      return self._updateForeignKeys(instance, removable, undefined);
    })
    .then(function() {
      var data = self._getInFlightData(instance);
      data.remove = _.difference(data.remove, objects);
      self._setInFlightData(instance, data);
    });
  }),

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
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @return {Actionable} A thenable object, use of which will trigger the
   * instance to be saved.
   * @see {@link BaseRelation#methods}
   */
  clearObjects: invalidatesQuery(function(instance) {
    this._clearCollectionCache(instance);
    this._setInFlightData(instance, { clear: true, add: [], remove: [] });
    return Actionable.create(instance.save.bind(instance));
  }),

  /**
   * Perform the necessary updates to clear objects for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery}.
   *
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   */
  _performClear: invalidatesQuery(function(instance) {
    var updates = _.object([[this.foreignKey, undefined]]);
    var query = this.objectsQuery(instance).update(updates);
    return query.execute();
  }),

  /**
   * Convenience method for associating objects that have just been fetched
   * from the database. This simply creates an empty cache, then associates the
   * given objects.
   *
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects to add to the association.
   * @see {@link HasMany~AssociationsMixin}
   */
  associateFetchedObjects: function(instance, objects) {
    this._setCollectionCache(instance, []);
    this.associateObjects(instance, objects, { attrs: false });
  },

  /**
   * Override of has many associations method which handles updating the
   * collection cache.
   *
   * @protected
   * @method
   * @see {@link HasMany~AssociationsMixin}
   */
  associateObjects: function(instance, objects/*, options*/) {
    this._super.apply(this, arguments);
    this._unionCollectionCache(instance, objects);
  },

  /**
   * Override of has many associations method which handles updating the
   * collection cache.
   *
   * @protected
   * @method
   * @see {@link HasMany~AssociationsMixin}
   */
  disassociateObjects: function(instance, objects/*, options*/) {
    this._super.apply(this, arguments);
    this._differenceCollectionCache(instance, objects);
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
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  initialize: function(instance) {
    var args = _.rest(arguments);
    instance._super.apply(instance, args);
    if (!instance.persisted) {
      this._setCollectionCache(instance, []);
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
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  save: function(instance) {
    var _super = instance._super;
    var args = _.rest(arguments);
    var self = this;
    var promise = BluebirdPromise.bind();
    var data = this._getInFlightData(instance);

    if (data.clear) {
      promise = promise.then(function() {
        return self._performClear(instance);
      });
    }

    if (data.add.length || data.remove.length) {
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
