'use strict';

var _ = require('lodash');
var util = require('util');
var BaseRelation = require('./base');
var BlueBirdPromise = require('bluebird');
var attr = require('../model/attr').fn;
var property = require('../util/property').fn;
var inflection = require('../util/inflection');

_.str = require('underscore.string');


/**
 * The belongs to property for models.
 *
 * Documentation forthcoming.
 *
 * For example:
 *
 *     var Article = Model.extend({
 *       author: belongsTo('user', { foreignKey: 'user_id', primaryKey: 'id' })
 *     });
 *
 * @since 1.0
 * @public
 * @constructor BelongsTo
 * @extends BaseRelation
 */
var BelongsTo = BaseRelation.extend(/** @lends BelongsTo# */ {
  init: function(name, modelClass, relatedModel, options) {
    var db = modelClass.db;

    if (relatedModel instanceof db.Model.__metaclass__) {}
    else if (_.isString(relatedModel)) {
      relatedModel = db.model(relatedModel);
    }
    else {
      relatedModel = db.model(name);
      options = relatedModel;
    }

    this._super(name, modelClass);
    this._relatedModel = relatedModel;
    this._options = options || {};
    this._itemCacheKey = '_' + this._name;
    this._itemObjectsQueryCacheKey =
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
      var modelNameUnderscoredPlural =
        inflection.pluralize(modelNameUnderscored);
      this._inverse = this._options.inverse ||
        _.str.camelize(modelNameUnderscoredPlural);
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
        _.str.underscored(this._name + '_id');
    }
    return this._foreignKey;
  }),

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @private
   * @type {String}
   */
  foreignKeyProperty: property(function() {
    if (!this._foreignKeyProperty) {
      this._foreignKeyProperty = _.str.camelize(this.foreignKey);
    }
    return this._foreignKeyProperty;
  }),

  /**
   * Override of {@link BaseRelation#template}.
   *
   * @since 1.0
   * @protected
   * @method
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
 * @since 1.0
 * @private
 * @method BelongsTo~invalidatesQuery
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
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  item: function(instance) {
    var result = instance[this._itemCacheKey];
    if (!result) {
      throw new Error(util.format('The relation "%s" has not yet been ' +
        'loaded.', this._name));
    }
    return result;
  },

  /**
   * Update the {@link BelongsTo#item} cache to contain a new value.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} value The new value for the item cache.
   */
  _cacheItem: function(instance, value) {
    instance[this._itemCacheKey] = value[0];
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
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  set: invalidatesQuery(function(instance, value) {
    instance[this._itemCacheKey] = value;
    instance[this.foreignKeyProperty] = value[this.primaryKey];
  }),

  objectsQuery: function(instance) {
    var cacheName = this._itemObjectsQueryCacheKey;
    if (!instance[cacheName]) {
      var where = _.object([[this.primaryKey, instance.attrs[this.foreignKey]]]);
      var cacheResult = _.bind(this._cacheItem, this, instance);
      instance[cacheName] = this._relatedModel
        .objects.where(where)
        .on('result', cacheResult);
    }
    return instance[cacheName];
  },


  /**
   * Update the {@link BelongsTo#objectsQuery} cache to contain a new value.
   *
   * @since 1.0
   * @protected
   * @method
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
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} args The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  create: invalidatesQuery(function(instance, args) {
    var relatedModel = this._relatedModel;
    var result = relatedModel.create.apply(relatedModel, args);
    // TODO: add to inverse here or in `set`?
    this.set(instance, result);
    return result;
  }),

  fetch: function(instance) {
    return this.objectsQuery(instance).execute()
    .then(function(result) {

      return result[0];
    });
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

    var queryKey = this.primaryKey;
    var fks = _.map(instances, this.foreignKeyProperty);

    if (instances.length === 1) { fks = fks[0]; }
    else { queryKey += '[in]'; }

    var where = _.object([[queryKey, fks]]);
    var query = this._relatedModel.objects.where(where);

    return query.execute();
    // TODO: associate related here?
    // .then(function(related) {
    //   var grouped = _.groupBy(related, function(item) {
    //     return item.attrs[self.primaryKey];
    //   });
    //   instances.forEach(function(instance) {
    //     var fk = instance[self.foreignKeyProperty];
    //     var cacheName = self._collectionCacheKey;
    //     var results = grouped[fk] || [];
    //     instance[cacheName] = results;
    //   });
    // });
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
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Array} args The arguments to the method.
   * @see {@link BaseRelation#methods}
   */
  save: function(instance, args) {
    var _super = instance._super;
    var foreignKeyProperty = this.foreignKeyProperty;
    var primaryKey = this.primaryKey;
    var related = instance[this._itemCacheKey];
    var resetForeignKey = related && !related.persisted;

    var promise = BlueBirdPromise.bind().then(function() {
      return related && related.save();
    });

    if (resetForeignKey) {
      promise = promise.then(function() {
        instance[foreignKeyProperty] = related[primaryKey];
      });
    }

    return promise.then(function() {
      return _super.apply(instance, args);
    });
  }
});

BelongsTo.reopenClass(/** @lends BelongsTo */ {
  methods: {
    '<singular>': BaseRelation.property('item', 'set'),
    '<singular>Relation': BaseRelation.property('identity'),
    'get<Singular>': BaseRelation.method('item'),
    'set<Singular>': BaseRelation.method('set'),
    'create<Singular>': BaseRelation.method('create'),
    'fetch<Singular>': BaseRelation.method('fetch'),
    '<foreignKey>': function(relation) {
      return attr(relation.foreignKey);
    },
    'save': BaseRelation.method('save')
  }
});

module.exports = BelongsTo.reopenClass({ __name__: 'BelongsTo' });
