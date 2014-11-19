'use strict';

var _ = require('lodash');
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
  init: function(relatedModel, options) {
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
   */
  identity: function(/*instance, args*/) {
    return this;
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  collection: function(/*instance, args*/) {
    // TODO: make this throw or return the collection data
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  objectsQuery: function(instance/*, args*/) {
    var opts = this._options;
    var where = _.object([[opts.foreignKey, instance[opts.primaryKey]]]);
    return this._relatedModel.objects.where(where);
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
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
   */
  clearObjects: function(instance/*, args*/) {
    var opts = this._options;
    var where = _.object([[opts.foreignKey, instance[opts.primaryKey]]]);
    var query = this._relatedModel.objects.where(where);
    return query.delete().execute();
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
