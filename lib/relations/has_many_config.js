'use strict';

var _ = require('lodash');
var util = require('util');
var Mixin = require('corazon/mixin');
var property = require('corazon/property');
var inflection = require('../util/inflection');

/**
 * A helper function for creating config properties that either reads from a
 * cached value or calls a function to get a value to cache.
 *
 * @function HasMany~config
 * @param {String} name The name of the option/property.
 * @param {Function} calculate A function to calculate the default value.
 * @return {Property} A config property
 */
var config = function(name, calculate) {
  var attr = '_' + name;
  return property(function() {
    if (this[attr] === undefined) {
      this[attr] = calculate.call(this);
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
  inverse: config('inverse', function() {
    return this._options.inverse || this.inverseDefault();
  }),

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
    var inverse = _.camelCase(this._modelClass.__name__);
    return this.inverseIsMany() ?
      inflection.pluralize(inverse) : inverse;
  },

  /**
   * Get the primary key for this relation. Access the option that was given or
   * simply use the value `pk`.
   *
   * @private
   * @type {String}
   */
  primaryKey: config('primaryKey', function() {
    return this._options.primaryKey || 'pk';
  }),

  /**
   * Get the primary key attribute value for this relation. This looks up the
   * attribute value on the model class.
   *
   * @private
   * @type {String}
   */
  primaryKeyAttr: config('primaryKeyAttr', function() {
    return this._modelClass.__class__.prototype[this.primaryKey + 'Attr'];
  }),

  /**
   * Get the foreign key for this relation. This will access the foreign key
   * value specified on the inverse relation, if an inverse relation exists. If
   * the inverse exists and the user also provided the `foreignKey` option when
   * creating this relation, it will ensure that the given value matches the
   * value from the inverse.
   *
   * If an inverse does not exist, this will return the value given for the
   * `foreignKey` option calculate the value based on the `inverse`.
   *
   * The resulting value will be locked in after the first call to avoid any
   * possible changes due to changing state outside of the relation.
   *
   * @private
   * @type {String}
   */
  foreignKey: config('foreignKey', function() {
    var foreignKey = this._options.foreignKey;
    var relatedClass = this._relatedModel.__class__;
    var prototype = relatedClass.prototype;
    var inverseRelation = prototype[this.inverse + 'Relation'];
    var inversePrimaryKey = inverseRelation && inverseRelation.primaryKey;
    if (inverseRelation && foreignKey && foreignKey !== inversePrimaryKey) {
      throw new Error(util.format('%s.%s foreign key must equal %j ' +
        'specified by %s.%s relation',
        this._modelClass.__identity__.__name__, this._name,
        inverseRelation.foreignKey,
        inverseRelation._modelClass.__identity__.__name__,
        inverseRelation._name));
    }
    if (inverseRelation) {
      foreignKey = inverseRelation.foreignKey;
    }
    if (!foreignKey) { // default in case the inverse does not exist
      foreignKey = _.camelCase(this.inverse + 'Id');
    }
    return foreignKey;
  }),

  /**
   * Get the foreign key attribute value for this relation. This looks up the
   * attribute value on the related class. If that value was not defied, it
   * falls back to the underscored version of {@link HasMany#foreignKey}.
   *
   * @private
   * @type {String}
   */
  foreignKeyAttr: config('foreignKeyAttr', function() {
    // since the related model may not have defined the reverse (belongs to)
    // relationship, (or manually defined the foreign key attribute), we need a
    // fallback here, so we snake case the property name.
    var relatedClass = this._relatedModel.__class__;
    var prototype = relatedClass.prototype;
    var foreignKeyAttr = prototype[this.foreignKey + 'Attr'];
    return foreignKeyAttr || _.snakeCase(this.foreignKey);
  }),

});
