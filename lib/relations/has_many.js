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
   * Documentation forthcoming.
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
   * Documentation forthcoming.
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
   * Documentation forthcoming.
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
   * Documentation forthcoming.
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
   * Documentation forthcoming.
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
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  _cacheCollection: function(instance, value) {
    instance[this._collectionCacheKey] = value;
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
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
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  _cacheObjectsQuery: function(instance, value) {
    instance[this._objectsQueryCacheKey] = value;
  },

  /**
   * Documentation forthcoming.
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
   * Documentation forthcoming.
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
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  _afterAddingObjects: function(instance, objects) {
    var unionAddedObjects = _.partialRight(_.union, objects);
    this._alterCollectionCache(instance, unionAddedObjects);
  },

  /**
   * Documentation forthcoming.
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
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  _afterRemovingObjects: function(instance, objects) {
    var differenceRemovedObjects = _.partialRight(_.difference, objects);
    this._alterCollectionCache(instance, differenceRemovedObjects);
  },

  /**
   * Documentation forthcoming.
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
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
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
