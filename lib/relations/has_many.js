'use strict';

var _ = require('lodash');
var util = require('util');
var property = require('../util/property').fn;
var BaseRelation = require('./base');

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

HasMany.reopen(/** @lends HasMany# */ {

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @private
   * @method
   * @return {Promise} A promise that resolves when the update has finished.
   */
  _updateRelatedObjects: function(instance, relatedObjects) {
    var foreignKey = this.foreignKey;
    var foreignKeyProperty = _.str.camelize(this.foreignKey);
    var inverse = this.inverse;
    var relatedIds = _.map(relatedObjects, 'id');
    var id = instance ? instance.id : undefined;

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
        addition[inverse] = instance;
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
   */
  _collectionCacheKey: function() {
    return '_' + this._name;
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
    var cacheName = this._collectionCacheKey();
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
   * @param {Model} instance The model instance on which to operate.
   * @see {@link BaseRelation#methods}
   */
  objectsQuery: function(instance) {
    var cacheName = this._collectionCacheKey();
    var where = _.object([[this.foreignKey, instance[this.primaryKey]]]);
    return this._relatedModel.objects.where(where).on('result', function(result) {
      instance[cacheName] = result;
    });
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
  createObject: function(instance, args) {
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
    return result;
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
  addObjects: function(instance, args) {
    return this._updateRelatedObjects(instance,
      _.flatten(args, true));
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
  removeObjects: function(instance, args) {
    return this._updateRelatedObjects(undefined,
      _.flatten(args, true));
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
  clearObjects: function(instance/*, args*/) {
    var where = _.object([[this.foreignKey, instance[this.primaryKey]]]);
    var query = this._relatedModel.objects.where(where);
    return query.delete().execute();
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
        var cacheName = self._collectionCacheKey();
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
    '<singular>Objects': BaseRelation.cachedProperty('objectsQuery'),
    'create<Singular>': BaseRelation.method('createObject'),
    'add<Singular>': BaseRelation.method('addObjects'),
    'add<Plural>': BaseRelation.method('addObjects'),
    'remove<Singular>': BaseRelation.method('removeObjects'),
    'remove<Plural>': BaseRelation.method('removeObjects'),
    'clear<Plural>': BaseRelation.method('clearObjects')
  }
});

module.exports = HasMany.reopenClass({ __name__: 'HasMany' });
