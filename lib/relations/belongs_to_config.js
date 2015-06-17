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
   * Override of {@link BaseRelation#configure}.
   *
   * @protected
   * @method
   * @see {@link BaseRelation#configure}
   */
  configure: function() {
    /* jshint expr: true */

    // TODO: this could be refactored to actually do configuration in this
    // method rather than simply calling each property.

    // configure each of the properties that are calculated on a delay by
    // simply invoking the property once.
    this.inverse;
    this.primaryKey;
    this.primaryKeyAttr;
    this.foreignKey;
    this.foreignKeyAttr;

    this.inverseRelation(); // ensure the inverse is configured
    this._super();
  },

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
    var inverse = this._options.inverse;

    var name = _.camelCase(this._modelClass.__name__);
    var singularized = inflection.singularize(name);
    var pluralized = inflection.pluralize(name);
    var related = this._relatedModel;

    if (inverse) { } // no need to search for it
    else if (related[pluralized + 'Relation']) { inverse = pluralized; }
    else if (related[singularized + 'Relation']) { inverse = singularized; }
    else {
      // find a relation w/ an inverse that points back to this one
      var match = _.find(related.relations, function(relation) {
        return relation._options.inverse === this._name;
      }.bind(this));
      inverse = _.get(match, '_name');
    }

    if (!inverse) {
      inverse = pluralized;
    }

    if (!related[inverse + 'Relation']) {
      var db = this._modelClass.db;
      var attr = db.hasMany(this._modelClass, {
        inverse: this._name,
        primaryKey: this._options.primaryKey,
        foreignKey: this._options.foreignKey,
        implicit: true,
      });
      related.reopen(_.object([[inverse, attr]]));
    }

    return inverse;
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
    var inverseRelation = this.inverseRelation();
    var inversePrimaryKey = inverseRelation && inverseRelation.primaryKey;
    if (inverseRelation && primaryKey && primaryKey !== inversePrimaryKey) {
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
    // we always try to find the foreign key attribute by looking at the model
    // class. it's possible that it won't be there, though. belongs-to
    // relationships that were created implicitly from a has-many won't add the
    // attribute, so we need to fall back to snake casing the foreign key.
    var modelClass = this._modelClass;
    var prototype = modelClass.__class__.prototype;
    var foreignKeyAttr = prototype[this.foreignKey + 'Attr'];
    if (!foreignKeyAttr) {
      foreignKeyAttr = _.snakeCase(this.foreignKey);
    }
    return foreignKeyAttr;
  }),

});
