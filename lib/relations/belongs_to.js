'use strict';

var _ = require('lodash');
var util = require('util');
var BaseRelation = require('./base');
var BluebirdPromise = require('bluebird');
var attr = require('../model/attr').fn;
var Config = require('./belongs_to_config');
var Associations = require('./belongs_to_associations');
var Prefetch = require('./belongs_to_prefetch');
var Join = require('./belongs_to_join');

_.str = require('underscore.string');


/**
 * The belongs to property for models.
 *
 * For example:
 *
 *     var Article = Model.extend({
 *       author: belongsTo('user', { foreignKey: 'user_id', primaryKey: 'id' })
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
 * @function Database#belongsTo
 */

/**
 * The belongs to property for models.
 *
 * @protected
 * @constructor BelongsTo
 * @extends BaseRelation
 * @see {@link Database#belongsTo}
 */
var BelongsTo = BaseRelation.extend();

BelongsTo.reopen(Config);
BelongsTo.reopen(Associations);
BelongsTo.reopen(Prefetch);
BelongsTo.reopen(Join);

BelongsTo.reopen(/** @lends BelongsTo# */ {
  init: function() {
    this._super.apply(this, arguments);
    this._itemCacheKey = '_' + this._name;
    this._itemObjectsQueryCacheKey =
      '_' + _.str.camelize(this._name + '_objectsQueryCache');
  },

  /**
   * Override of {@link BaseRelation#template}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#template}
   */
  template: function(key) {
    return this._super(key)
      .replace('<foreignKey>', this.foreignKeyProperty);
  }

});

/**
 * This wrapper method is used to immediately invalidate the `objectsQuery`
 * cache when performing any sort of update to related objects.
 *
 * The resulting wrapper function expects to be called with the first argument
 * being the model instance on which it is operating. It will use this to
 * invalidate the `objectsQuery` cache. It also expects that it will be used as
 * an instance method on a `BelongsTo` relation.
 *
 * @method BelongsTo~invalidatesQuery
 * @private
 * @param {Function} fn The function to wrap.
 * @return {Function} The wrapper function.
 * @see {@link BelongsTo#_cacheObjectsQuery}
 */
var invalidatesQuery = function(fn) {
  return function(instance) {
    this._cacheObjectsQuery(instance, undefined);
    return fn.apply(this, arguments);
  };
};

BelongsTo.reopen(/** @lends BelongsTo# */ {

  /**
   * The identity property for this relation.
   *
   * This property allows access to the underlying relation object, allowing
   * you to access details about how the relation was created/configured. This
   * method is currently only intended for internal use, but if you have a
   * reason for it to be documented publicly, please create an issue on GitHub
   * and let us know.
   *
   * It is accessible on an individual model via `<singular>Relation`. For
   * instance, an article that belongs to an author would cause this method to
   * get triggered via `article.authorRelation`.
   *
   * The naming conventions are set forth in {@link BelongsTo.methods}.
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
   * The item property for this relation.
   *
   * This property allows access to the cached object that has been fetched
   * for a specific model in a given relation. Before the cache has been
   * filled, accessing this property will throw an exception.
   *
   * It is accessible on an individual model via `<singular>` and via
   * `get<Singular>`. For instance, an article that belongs to an author would
   * cause this method to get triggered via `article.author` or
   * `article.getAuthor`.
   *
   * The naming conventions are set forth in {@link BelongsTo.methods}.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  item: function(instance) {
    var result = this._related(instance);
    if (result === undefined) {
      throw new Error(util.format('The relation "%s" has not yet been ' +
        'loaded.', this._name));
    }
    return result;
  },

  /**
   * Get the {@link BelongsTo#item} cache value.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} value The new value for the item cache.
   */
  _related: function(instance) {
    return instance[this._itemCacheKey];
  },

  /**
   * Update the {@link BelongsTo#item} cache to contain a new value. This will
   * always mark the cache as full. To clear the cache, use
   * {@link BelongsTo#_clearItem}.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} value The new value for the item cache.
   */
  _setRelated: function(instance, value) {
    instance[this._itemCacheKey] = value || null;
  },

  /**
   * The item property setter for this relation.
   *
   * This property allows altering the associated object of a specific model in
   * a given relation.
   *
   * It is accessible on an individual model via assignment with `<singular>`
   * and via `set<Singular>`. For instance, an article that belongs to an
   * author would cause this method to get triggered via
   * `article.author = '...'` or `article.setAuthor`.
   *
   * The naming conventions are set forth in {@link BelongsTo.methods}.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  set: invalidatesQuery(function(instance, value) {
    var current = this._related(instance);
    if (current) { this.disassociate(instance, current); }
    if (value) { this.associate(instance, value); }
  }),

  /**
   * The objects query property for this relation.
   *
   * This property allows you access to a query which you can use to fetch the
   * object for a relation on a given model and/or to configure the query to
   * build a new query with more restrictive conditions.
   *
   * When you fetch the object, the result will be cached and accessible via
   * the {@link BelongsTo#collection} (if loaded).
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
   * It is currently not accessible on an individual model.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   */
  objectsQuery: function(instance) {
    var cacheName = this._itemObjectsQueryCacheKey;
    if (!instance[cacheName]) {
      var where = _.object([[
        this.primaryKey, instance.getAttribute(this.foreignKey)
      ]]);
      var cacheResult = _.bind(this.associateFetchedObjects, this, instance);
      instance[cacheName] = this._relatedModel
        .objects.where(where).limit(1)
        .on('result', cacheResult);
    }
    return instance[cacheName];
  },

  /**
   * Update the {@link BelongsTo#objectsQuery} cache to contain a new value.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Object} value The new value.
   */
  _cacheObjectsQuery: function(instance, value) {
    instance[this._itemObjectsQueryCacheKey] = value;
  },

  /**
   * The create object method for this relation.
   *
   * This simply creates a new object that has the appropriate relation data
   * already set.
   *
   * This method invalidates the {@link BelongsTo#objectsQuery} cache and sets
   * the created object as the {@link BelongsTo#item}.
   *
   * It is accessible on an individual model via `create<Singular>`. For
   * instance, an article that belongs to an author would cause this method to
   * get triggered via `article.createAuthor`.
   *
   * The naming conventions are set forth in {@link BelongsTo.methods}.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  create: invalidatesQuery(function(instance) {
    var args = _.rest(arguments);
    var relatedModel = this._relatedModel;
    var result = relatedModel.create.apply(relatedModel, args);
    this.associate(instance, result);
    return result;
  }),

  /**
   * Fetch the related object. If there is no foreign key defined on the
   * instance, this method will not actually query the database.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  fetch: function(instance) {
    var self = this;
    var result = BluebirdPromise.bind();
    var fk = instance.getAttribute(this.foreignKey);
    if (fk) {
      result = result.then(function() {
        return self.objectsQuery(instance).execute();
      })
      .then(function(result) {
        self.validateFetchedObjects(instance, result);
        return result[0];
      });
    }
    else {
      result = result.then(function() {
        // pretend like we actually did the whole fetch & got back nothing
        self.associateFetchedObjects(instance, [null]);
      });
    }
    return result;
  },

  /**
   * Validate fetched objects, ensuring that exactly one object was obtained
   * when the foreign key is set.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   */
  validateFetchedObjects: function(instance, objects) {
    var foreignKey = this.foreignKey;
    var fk = instance.getAttribute(foreignKey);
    if (fk && objects.length === 0) {
      var relatedModel = this._relatedModel;
      var relatedClass = relatedModel.__identity__;
      var relatedName = relatedClass.__name__;
      throw new Error(util.format('Found no %s with %j %d',
        relatedName, foreignKey, fk));
    }
  },

  /**
   * Convenience method for associating objects that have just been fetched
   * from the database. This simply associates the first object in the result
   * set.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {Array.<Model>} objects The objects to add to the association.
   * @see {@link HasMany~AssociationsMixin}
   */
  associateFetchedObjects: function(instance, objects) {
    this.associate(instance, objects[0], { attrs: false });
  },

  /**
   * Override of the model's save method.
   *
   * This allows the relation to save the related object in response to the
   * instance on which it is operating being saved.
   *
   * During the process of saving the related object, it checks to see if it
   * was a newly inserted object & will re-assign the foreign key (via the
   * foreign key property) once that object has been saved & assigned an id.
   *
   * It is accessible on an individual model via `save`, and as such is an
   * override of the builtin save method.
   *
   * As with all other relation methods, the naming conventions are set forth
   * in {@link BelongsTo.methods}.
   *
   * @method
   * @protected
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  save: function(instance) {
    var args = _.rest(arguments);
    var _super = instance._super;
    var foreignKey = this.foreignKey;
    var primaryKey = this.primaryKey;
    var related = this._related(instance);
    var resetForeignKey = related && related.newRecord;

    var promise = BluebirdPromise.bind().then(function() {
      return related && related.save();
    });

    if (resetForeignKey) {
      promise = promise.then(function() {
        instance.setAttribute(foreignKey, related[primaryKey]);
      });
    }

    return promise.then(function() {
      return _super.apply(instance, args);
    });
  }
});

BelongsTo.reopenClass(/** @lends BelongsTo */ {

  /**
   * Model does hold the foreign key.
   *
   * @private
   * @type {Boolean}
   * @see {@link BaseRelation#hostsForeignKey}
   */
  hostsForeignKey: true,

  /**
   * Naming conventions for `BelongsTo` relations.
   *
   * @private
   * @type {Object}
   * @see {@link BaseRelation#methods}
   */
  methods: {
    '<singular>': BaseRelation.property('item', 'set'),
    '<singular>Relation': BaseRelation.property('identity'),
    'get<Singular>': BaseRelation.method('item'),
    'set<Singular>': BaseRelation.method('set'),
    'create<Singular>': BaseRelation.method('create'),
    'fetch<Singular>': BaseRelation.method('fetch'),
    '<foreignKey>': function(relation) {
      return attr(relation.foreignKey, { writable: false });
    },
    'save': BaseRelation.method('save')
  }
});

module.exports = BelongsTo.reopenClass({ __name__: 'BelongsTo' });
