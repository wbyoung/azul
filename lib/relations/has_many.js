'use strict';

var _ = require('lodash');
var util = require('util');
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
  init: function(name, relatedModel, options) {
    this._super(name);
    this._relatedModel = relatedModel;
    this._options = options;
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  _setup: function(instance) {
    if (this._isSetup) { return; }

    var modelName = instance.__identity__.__name__;
    var modelNameUnderscored = _.str.underscored(modelName);

    this._isSetup = true;
    this._originalOptions = this._options;
    this._options = _.defaults({}, this._options, { primaryKey: 'id' });
    this._options.inverse = this._options.inverse ||
      _.str.camelize(modelNameUnderscored);
    this._options.foreignKey = this._options.foreignKey ||
      _.str.underscored(this._options.inverse + '_id');
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @private
   * @method
   * @return {Promise} A promise that resolves when the update has finished.
   */
  _updateRelatedObjects: function(model, relatedObjects) {
    var options = this._options;
    var foreignKey = _.str.underscored(options.foreignKey);
    var foreignKeyProperty = _.str.camelize(options.foreignKey);
    var inverse = options.inverse;
    var relatedIds = _.map(relatedObjects, 'id');
    var id = model ? model.id : undefined;

    var updates = _.object([[foreignKey, id]]);
    var conditions = {};
    if (relatedIds.length === 1) { conditions.id = relatedIds[0]; }
    else { conditions['id[in]'] = relatedIds; }

    var query = this._relatedModel.objects;
    return query.where(conditions).update(updates).on('result', function() {
      relatedObjects.forEach(function(addition) {
        addition[foreignKeyProperty] = id;
        addition[inverse] = model;
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
    var opts = this._options;
    var cacheName = this._collectionCacheKey();
    var where = _.object([[opts.foreignKey, instance[opts.primaryKey]]]);
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
    var options = this._options;
    var foreignKeyProperty = _.str.camelize(options.foreignKey);
    var inverse = options.inverse;
    var modelClass = this._relatedModel;
    var result = modelClass.create.apply(modelClass, args);
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
    var opts = this._options;
    var where = _.object([[opts.foreignKey, instance[opts.primaryKey]]]);
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
    var opts = this._options;
    var queryKey = opts.foreignKey;
    var pks = _.map(instances, opts.primaryKey);

    if (instances.length === 1) { pks = pks[0]; }
    else { queryKey += '[in]'; }

    var where = _.object([[queryKey, pks]]);
    var query = this._relatedModel.objects.where(where);

    return query.execute().then(function(related) {
      var grouped = _.groupBy(related, function(item) {
        return item.attrs[opts.foreignKey];
      });
      instances.forEach(function(instance) {
        var pk = instance[opts.primaryKey];
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
