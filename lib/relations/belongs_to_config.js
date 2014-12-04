'use strict';

var _ = require('lodash');
var property = require('../util/property').fn;
var inflection = require('../util/inflection');
var Mixin = require('../util/mixin');

_.str = require('underscore.string');

/**
 * HasMany mixin for options/configuration.
 *
 * @mixin BelongsTo~ConfigMixin
 */
module.exports = Mixin.create(/* lends BelongsTo~ConfigMixin */{

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

});
