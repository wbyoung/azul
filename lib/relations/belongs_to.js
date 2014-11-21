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
});

BelongsTo.reopenClass(/** @lends BelongsTo */ {
  methods: {
    '<foreignKey>': function(relation) {
      return attr(relation.foreignKey);
    },
  }
});

module.exports = BelongsTo.reopenClass({ __name__: 'BelongsTo' });
