'use strict';

var _ = require('lodash');
var BaseRelation = require('./base');
var attr = require('../model/attr').fn;
var property = require('../util/property').fn;
var inflection = require('../util/inflection');

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
    this._super(name, modelClass);
    this._relatedModel = relatedModel;
    this._options = options || {};
    this._itemCacheKey = '_' + this._name;
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
   * Override of {@link BaseRelation#template}.
   *
   * @since 1.0
   * @protected
   * @method
   * @see {@link BaseRelation#template}
   */
  template: function(key) {
    return this._super(key)
      .replace('<foreignKey>', _.str.camelize(this.foreignKey));
  }

});

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
   * It is accessible on an individual model via `<singular>`. For
   * instance, an article that belongs to an author would cause this method to
   * get triggered via `article.author`.
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
    return instance[this._itemCacheKey];
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
  setItem: function(instance, value) {
    instance[this._itemCacheKey] = value;
  },

  fetchItem: function() {

  },

  storeItem: function() {

  }

});

BelongsTo.reopenClass(/** @lends BelongsTo */ {
  methods: {
    '<singular>': BaseRelation.property('item', 'setItem'),
    '<singular>Relation': BaseRelation.property('identity'),
    'set<Singular>': BaseRelation.method('setItem'),
    'fetch<Singular>': BaseRelation.method('fetchItem'),
    'store<Singular>': BaseRelation.method('storeItem'),
    '<foreignKey>': function(relation) {
      return attr(relation.foreignKey);
    },
  }
});

module.exports = BelongsTo.reopenClass({ __name__: 'BelongsTo' });
