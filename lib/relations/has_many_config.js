'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');
var property = require('../util/property').fn;
var inflection = require('../util/inflection');

_.str = require('underscore.string');

/**
 * HasMany mixin for options/configuration.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends HasMany# */ {

  /**
   * Get the inverse of this relation. Access the option that was given or
   * calculate the value based on the current model class name.
   *
   * The resulting value will be locked in after the first call to avoid any
   * possible changes due to changing state outside of the relation.
   *
   * @private
   * @type {String}
   */
  inverse: property(function() {
    if (!this._inverse) {
      this._inverse = this._options.inverse || this._inverseDefault();
    }
    return this._inverse;
  }),

  /**
   * Calculate the value for the inverse for when an option was not provided
   * for the inverse.
   *
   * @method
   * @private
   * @return {String} The inverse name.
   */
  _inverseDefault: function() {
    // using underscored ensures that the class name is properly lowercased
    var modelNameUnderscored = _.str.underscored(this._modelClass.__name__);
    var inverse = _.str.camelize(modelNameUnderscored);
    return this.inverseIsMany() ?
      inflection.pluralize(inverse) : inverse;
  },

  /**
   * Get the primary key for this relation. Access the option that was given or
   * simply use the value `id`.
   *
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
   * Get the foreign key for this relation. Access the option that was given or
   * calculate the value based on the `inverse`.
   *
   * The resulting value will be locked in after the first call to avoid any
   * possible changes due to changing state outside of the relation.
   *
   * @private
   * @type {String}
   */
  foreignKey: property(function() {
    if (!this._foreignKey) {
      this._foreignKey = this._options.foreignKey || this._foreignKeyDefault();
    }
    return this._foreignKey;
  }),

  /**
   * Calculate the value for the foreign key for when an option was not
   * provided for the foreign key.
   *
   * @method
   * @private
   * @return {String} The foreign key name.
   */
  _foreignKeyDefault: function() {
    return _.str.underscored(this.inverse + '_id');
  },

});
