'use strict';

var _ = require('lodash');
var util = require('util');
var property = require('corazon/property');
var inflection = require('../util/inflection');
var Mixin = require('corazon/mixin');

/**
 * A helper function for creating config properties that either reads from a
 * cached value or calls a function to get a value to cache.
 *
 * @function BelongsTo~config
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
 * BelongsTo mixin for options/configuration.
 *
 * This mixin separates some of the logic of {@link BelongsTo} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends BelongsTo# */ {

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
    return this._options.inverse ||
      inflection.pluralize(_.camelCase(this._modelClass.__name__));
  }),

  /**
   * Get the primary key for this relation. This will access the primary key
   * value specified on the inverse relation, if an inverse relation exists. If
   * the inverse exists and the user also provided the `primaryKey` option when
   * creating this relation, it will ensure that the given value matches the
   * value from the inverse.
   *
   * If an inverse does not exist, this will return the value given for the
   * `primaryKey` option or `pk` as a default.
   *
   * The resulting value will be locked in after the first call to avoid any
   * possible changes due to changing state outside of the relation.
   *
   * @private
   * @type {String}
   */
  primaryKey: config('primaryKey', function() {
    var primaryKey = this._options.primaryKey;
    var relatedClass = this._relatedModel.__class__;
    var prototype = relatedClass.prototype;
    var inverseRelation = prototype[this.inverse + 'Relation'];
    if (inverseRelation && primaryKey && primaryKey !== inverseRelation.primaryKey) {
      throw new Error(util.format('%s.%s primary key must equal %j ' +
        'specified by %s.%s relation',
        this._modelClass.__identity__.__name__, this._name,
        inverseRelation.primaryKey,
        inverseRelation._modelClass.__identity__.__name__,
        inverseRelation._name));
    }
    if (inverseRelation) {
      primaryKey = inverseRelation.primaryKey;
    }
    if (!primaryKey) { // default in case the inverse does not exist
      primaryKey = 'pk';
    }
    return primaryKey;
  }),

  /**
   * Get the primary key attribute value for this relation. This looks up the
   * attribute value on the related class. If that value was not defied, it
   * falls back to the underscored version of {@link BelongsTo#primaryKey}.
   *
   * @private
   * @type {String}
   */
  primaryKeyAttr: config('primaryKeyAttr', function() {
    // since the related model may not have defined the attribute being used as
    // the primary key attribute, we need a fallback here, so we snake case the
    // property name.
    var relatedClass = this._relatedModel.__class__;
    var prototype = relatedClass.prototype;
    var primaryKeyAttr = prototype[this.primaryKey + 'Attr'];
    return primaryKeyAttr || _.snakeCase(this.primaryKey);
  }),

  /**
   * Get the foreign key for this relation. Access the option that was given or
   * calculate the value based on the relation name.
   *
   * @private
   * @type {String}
   */
  foreignKey: config('foreignKey', function() {
    return this._options.foreignKey || _.camelCase(this._name + 'Id');
  }),

  /**
   * Get the foreign key attribute value for this relation. This looks up the
   * attribute value on the model class.
   *
   * @private
   * @type {String}
   */
  foreignKeyAttr: config('foreignKeyAttr', function() {
    return this._modelClass.__class__.prototype[this.foreignKey + 'Attr'];
  }),

});
