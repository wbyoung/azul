'use strict';

var _ = require('lodash');
var util = require('util');
var BluebirdPromise = require('bluebird');
var BaseRelation = require('./base');
var Actionable = require('../util/actionable');
var Hooks = require('./has_many_hooks');
var Config = require('./has_many_config');
var Associations = require('./has_many_associations');
var Overrides = require('./has_many_overrides');
var Through = require('./has_many_through');
var Prefetch = require('./has_many_prefetch');
var Join = require('./has_many_join');
var Collection = require('./has_many_collection');
var InFlight = require('./has_many_in_flight');

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
 * @param {String} [options.through] Specify the name of a relationship through
 * which this collection is accessed.
 * @param {String} [options.source] When using `through` this is the name of
 * the relationship on the destination model. The default value is the name of
 * the attribute for the relationship.
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

HasMany.reopen(Hooks);
HasMany.reopen(Config);
HasMany.reopen(Associations);
HasMany.reopen(Overrides);
HasMany.reopen(Through);
HasMany.reopen(Prefetch);
HasMany.reopen(Join);
HasMany.reopen(Collection);
HasMany.reopen(InFlight);

/**
 * This wrapper method is used to immediately invalidate the `objectsQuery`
 * cache when performing any sort of update to related objects.
 *
 * The resulting wrapper function expects to be called with the first argument
 * being the model instance on which it is operating. It will use this to
 * invalidate the `objectsQuery` cache. It also expects that it will be used as
 * an instance method on a `HasMany` relation.
 *
 * @method HasMany~invalidatesQuery
 * @private
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

/**
 * Notify of changes around a call to super.
 *
 * @function HasMany~notify
 * @private
 * @param {String} name The suffix of the before/after methods to call.
 * @return {Function} A method that will call before & after methods.
 */
var notify = function(name) {
  var before = 'before' + _.str.capitalize(name);
  var after = 'after' + _.str.capitalize(name);
  return function() {
    this[before].apply(this, arguments);
    this._super.apply(this, arguments);
    this[after].apply(this, arguments);
  };
};

HasMany.reopen(/** @lends HasMany# */ {
  init: function() {
    this._super.apply(this, arguments);
    this._objectsQueryCacheKey =
      '_' + _.str.camelize(this._name + '_objectsQueryCache');
  },

  /**
   * Prepare many related objects for a foreign key update.
   *
   * This will save any dirty records unless the only attribute that is dirty
   * is the foreign key. It will also save any newly created objects regardless
   * of whether or not they are dirty.
   *
   * @method
   * @private
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} relatedObjects The related models to prepare.
   * @return {Promise} A promise that resolves when the prep work has finished.
   */
  _prepareForForeignKeyUpdate: function(instance, relatedObjects) {
    // TODO: is there a better way to keep this from happening that makes it
    // more clear the distinction between a through and a normal has-many?
    // note that the reason that nothing is required to happen here is because
    // updates will happen when the join model is saved.
    if (this._options.through) { return BluebirdPromise.bind(); }
    var foreignKey = this.foreignKey;
    return BluebirdPromise.map(relatedObjects, function(obj) {
      var dirty = _.without(obj.dirtyAttributes, foreignKey);
      var save = dirty.length || obj.newRecord;
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
   * @method
   * @private
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} relatedObjects The related models on which to
   * update keys.
   * @param {?} id The id to use as the value of the foreign key.
   * @return {Promise} A promise that resolves when the update has finished.
   */
  _updateForeignKeys: function(instance, relatedObjects, id) {
    // TODO: is there a better way to keep this from happening that makes it
    // more clear the distinction between a through and a normal has-many?
    // note that the reason that nothing is required to happen here is because
    // updates will happen when the join model is saved.
    if (this._options.through) { return BluebirdPromise.bind(); }
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
   * @method
   * @protected
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
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  collection: function(instance) {
    var result = this._getCollectionCache(instance);
    if (!result) {
      throw new Error(util.format('The relation "%s" has not yet been ' +
        'loaded.', this._name));
    }
    return result;
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
   * Default scoping for object query. This is invoked from the overridable
   * {@link HasMany#scopeObjectQuery}.
   *
   * @param {Model} instance The model instance on which to operate.
   * @param {ChainedQuery} query The query to scope.
   * @return {ChainedQuery} query The newly configured query.
   */
  _scopeObjectQuery: function(instance, query) {
    var where = _.object([[
      this.foreignKey, instance.getAttribute(this.primaryKey)
    ]]);
    return query.where(where);
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
   * @method
   * @protected
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
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   * @return {Actionable} A thenable object, use of which will trigger the
   * instance to be saved.
   * @see {@link BaseRelation#methods}
   */
  addObjects: invalidatesQuery(function(instance) {
    var args = _.rest(arguments);
    var objects = _.flatten(args, true);
    this.beforeAddingObjects(instance, objects);
    this.associateObjects(instance, objects);
    return Actionable.create(instance.save.bind(instance));
  }),

  /**
   * Perform the necessary updates to add objects for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery}.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} objects The objects to add to the relationship.
   */
  _performAdd: invalidatesQuery(function(instance, objects) {
    var self = this;
    var after = this.afterAddingObjects.bind(this, instance, objects);
    return self._prepareForForeignKeyUpdate(instance, objects)
    .then(function() {
      return self._updateForeignKeys(instance, objects, instance.id);
    })
    .tap(after);
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
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   * @return {Actionable} A thenable object, use of which will trigger the
   * instance to be saved.
   * @see {@link BaseRelation#methods}
   */
  removeObjects: invalidatesQuery(function(instance) {
    var args = _.rest(arguments);
    var objects = _.flatten(args, true);
    this.beforeRemovingObjects(instance, objects);
    this.disassociateObjects(instance, objects);
    return Actionable.create(instance.save.bind(instance));
  }),

  /**
   * Perform the necessary updates to remove objects for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery}.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} objects The objects to remove from the relationship.
   */
  _performRemove: invalidatesQuery(function(instance, objects) {
    var self = this;
    var after = this.afterRemovingObjects.bind(this, instance, objects);
    var removable = _.filter(objects, 'persisted');
    return self._prepareForForeignKeyUpdate(instance, removable)
    .then(function() {
      return self._updateForeignKeys(instance, removable, undefined);
    })
    .tap(after);
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
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @return {Actionable} A thenable object, use of which will trigger the
   * instance to be saved.
   * @see {@link BaseRelation#methods}
   */
  clearObjects: invalidatesQuery(function(instance) {
    this.beforeClearingObjects(instance);
    return Actionable.create(instance.save.bind(instance));
  }),

  /**
   * Perform the necessary updates to clear objects for this relation.
   *
   * This method invalidates the {@link HasMany#objectsQuery}.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   */
  _performClear: invalidatesQuery(function(instance) {
    var updates = _.object([[this.foreignKey, undefined]]);
    var query = this.objectsQuery(instance).update(updates);
    var after = this.afterClearingObjects.bind(this, instance);
    return query.execute().tap(after);
  }),

  /**
   * Override of {@link HasMany#associateFetchedObjects} to call before & after
   * hooks so that mixins can get involved in the association process.
   *
   * @method
   * @protected
   * @see {@link HasMany#associateFetchedObjects}
   */
  associateFetchedObjects: notify('associatingFetchedObjects'),

  /**
   * Override of {@link HasMany#associateObjects} to call before & after hooks
   * so that mixins can get involved in the association process.
   *
   * @method
   * @protected
   * @see {@link HasMany#associateObjects}
   */
  associateObjects: notify('associatingObjects'),

  /**
   * Override of {@link HasMany#disassociateObjects} to call before & after
   * hooks so that mixins can get involved in the disassociation process.
   *
   * @method
   * @protected
   * @see {@link HasMany#disassociateObjects}
   */
  disassociateObjects: notify('disassociatingObjects'),

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
