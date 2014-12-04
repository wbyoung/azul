'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');
var property = require('../util/property').fn;

_.str = require('underscore.string');

/**
 * HasMany mixin for options/configuration.
 *
 * @mixin HasMany~ConfigMixin
 */
module.exports = Mixin.create(/* lends HasMany~ConfigMixin */{

  /**
   * Get the inverse of this relation.
   *
   * Access the option that was given or calculate the value based on the
   * current model class name. The resulting value will be locked in after the
   * first call to avoid any possible changes due to changing state outside of
   * the relation.
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
   * Get the primary key for this relation.
   *
   * Access the option that was given or calculate the value based on the
   * current model class name. The resulting value will be locked in after the
   * first call to avoid any possible changes due to changing state outside of
   * the relation.
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
   * Get the foreign key for this relation.
   *
   * Access the option that was given or calculate the value based on the
   * current model class name. The resulting value will be locked in after the
   * first call to avoid any possible changes due to changing state outside of
   * the relation.
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
