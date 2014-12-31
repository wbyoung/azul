'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');
var property = require('../util/property').fn;
var inflection = require('../util/inflection');

_.str = require('underscore.string');

/**
 * A helper function for creating config properties that either reads from a
 * cached value or calls a method to get a value to cache.
 *
 * @function HasMany~config
 * @param {String} name The name of the option/property.
 * @return {Property} A config property
 */
var config = function(name) {
  var attr = '_' + name;
  var method = name + 'Default';
  return property(function() {
    if (this[attr] === undefined) {
      this[attr] = this._options[name] || this[method]();
    }
    return this[attr];
  });
};

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
  inverse: config('inverse'),

  /**
   * Calculate the default value of the inverse for when an option was not
   * provided for this relation.
   *
   * Mixins can override {@link HasMany#inverseDefault} if they need to change
   * the inverse default. This is the default implementation.
   *
   * @method
   * @private
   * @return {String} The default value.
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
  primaryKey: config('primaryKey'),

  /**
   * Calculate the default value of the primary key for when an option was not
   * provided for this relation.
   *
   * Mixins can override {@link HasMany#primaryKeyDefault} if they need to
   * change the primary key default. This is the default implementation.
   *
   * @method
   * @private
   * @return {String} The default value.
   */
  _primaryKeyDefault: function() {
    return 'id';
  },

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
  foreignKey: config('foreignKey'),

  /**
   * Calculate the default value of the foreign key for when an option was not
   * provided for this relation.
   *
   * Mixins can override {@link HasMany#foreignKeyDefault} if they need to
   * change the foreign key default. This is the default implementation.
   *
   * @method
   * @private
   * @return {String} The default value.
   */
  _foreignKeyDefault: function() {
    return _.str.underscored(this.inverse + '_id');
  },

});
