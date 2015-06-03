'use strict';

var _ = require('lodash');
var util = require('util');
var Mixin = require('corazon/mixin');

_.str = require('underscore.string');

/**
 * Look up a database field name.
 *
 * @function BoundTransform~attr
 * @private
 * @param {Class} modelClass The model class on which to perform the lookup.
 * @param {String} name The attribute name to look up.
 * @return {String} The database field name.
 */
var attr = function(modelClass, name) {
  return modelClass && modelClass.__class__.prototype[name + 'Attr'];
};

/**
 * Simple override wrapper function to ensure that a method only will be called
 * when the current query is bound to a model.
 *
 * @function BoundTransform~override
 * @private
 * @param {Function} fn The method implementation
 * @return {Function} A wrapped method
 */
var override = function(fn) {
  return function() {
    if (this._model) { return fn.apply(this, arguments); }
    else { return this._super.apply(this, arguments); }
  };
};

/**
 * Model query mixin for transformation of field strings & expression values.
 *
 * This mixin relies on external functionality:
 *
 *   - It relies on properties & functionality from {@link ModelCore}.
 *   - It relies on properties of {@link ModelJoin}. Reference that mixin for
 *     code & documentation.
 *   - It must be mixed in before the {@link ModelAutoJoin} mixin.
 *
 * @mixin BoundTransform
 */
module.exports = Mixin.create(/** @lends BoundTransform# */ {

  /**
   * Override of {@link SelectQuery#_toField} and {@link GroupBy#_toField}.
   * Performs field transforms.
   *
   * @method
   * @protected
   * @see {@link SelectQuery#_toField}
   * @see {@link GroupBy#_toField}
   */
  _toField: override(function(/*field*/) {
    return this._fieldTransform(this._super.apply(this, arguments));
  }),

  /**
   * Override of {@link InsertQuery#_toValues} and
   * {@link UpdateQuery#_toValues}. Performs field transforms.
   *
   * @method
   * @protected
   * @see {@link InsertQuery#_toValues}
   * @see {@link UpdateQuery#_toValues}
   */
  _toValues: override(function(/*values*/) {
    return this._transformValues(this._super.apply(this, arguments));
  }),

  /**
   * Override of {@link Where#_toCondition}. Performs field transforms.
   *
   * @method
   * @protected
   * @see {@link Where#_toCondition}
   */
  _toCondition: override(function(/*args*/) {
    return this._transformCondition(this._super.apply(this, arguments));
  }),

  /**
   * Override of {@link Order#_toOrder}. Performs field transforms.
   *
   * @method
   * @protected
   * @see {@link Order#_toOrder}
   */
  _toOrder: override(function(/*args*/) {
    return this._transformOrderBy(this._super.apply(this, arguments));
  }),

  /**
   * Transform fields within a _values_ object. This applies transformations to
   * the keys of the object. An object with fields as its keys would be used
   * both for insert and update style queries.
   *
   * @param {Object} values The values to transform.
   * @return {Object} An object with the same values, but with the property
   * names transformed.
   */
  _transformValues: function(values) {
    return values && _.transform(values, function(obj, value, field) {
      obj[this._fieldTransform(field)] = value;
    }.bind(this));
  },

  /**
   * Transforms all field names within a condition to their appropriate values
   * taking into account the current model and joined relations.
   *
   * @method
   * @private
   * @param {Condition} condition The condition to transform.
   * @return {Condition} The newly transformed condition.
   */
  _transformCondition: function(condition) {
    return condition.transformExpressions(function(predicate, field, value) {
      return [
        this._fieldTransform(field),
        this._valueTransform(field, value),
      ];
    }.bind(this));
  },

  /**
   * Transforms all field names within an order by to their appropriate values
   * taking into account the current model and joined relations.
   *
   * @method
   * @private
   * @param {Array.<Phrasing~OrderSpec>} order An array of order objects.
   * @return {Array.<Phrasing~OrderSpec>} The newly transformed order.
   */
  _transformOrderBy: function(order) {
    return order.map(function(order) {
      return _.extend({}, order, {
        field: this._fieldTransform(order.field)
      });
    }, this);
  },

  /**
   * Apply all transforms for fields within conditions.
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldTransform: function(field) {
    // order matters here, see the documentation for each method
    field = this._fieldTransformRelationToPrimaryKey(field);
    field = this._fieldTransformQualifyRelationAttrs(field);
    field = this._fieldTransformVerify(field);
    field = this._fieldTransformToDatabaseName(field);
    field = this._fieldTransformAssociationsToTables(field);
    field = this._fieldTransformQualifyTable(field);
    return field;
  },

  /**
   * Apply all transforms for values within conditions.
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @param {Object} value The value to transform.
   * @return {Object} The transformed value.
   */
  _valueTransform: function(field, value) {
    // order matters here, see the documentation for each method
    value = this._valueTransformRelationToPrimaryKey(field, value);
    return value;
  },

  /**
   * Update fields that are accessing a related object to access the primary
   * key instead. For instance, a query for an article's `author` would be
   * changed to `author.pk`. This will only occur for joined relationships
   * (and auto-joined relationships).
   *
   * This must be run before all other transformation functions since it
   * ensures that each field follows the convention of ending with an actual
   * field name (rather than possibly ending with an association name).
   *
   * Must run before {@link BoundTransform#_fieldTransformQualifyRelationAttrs}.
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldTransformRelationToPrimaryKey: function(field) {
    return this._joinedRelations && this._joinedRelations[field] ?
      [field, 'pk'].join('.') : field;
  },

  /**
   * Update values that are accessing a related object to access the primary
   * key instead. For instance, a query for an article's `author` would be
   * changed access the model object's `pk`. This will only occur for joined
   * relationships (and auto-joined relationships).
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @param {Object} value The value to transform.
   * @return {Object} The transformed value.
   */
  _valueTransformRelationToPrimaryKey: function(field, value) {
    return this._joinedRelations && this._joinedRelations[field] ?
      value.pk : value;
  },

  /**
   * Add a relation name prefix when appropriate.
   *
   * When a prefix is absent, and the current field does not specify a table or
   * relation, then a search is done for a relation with this field name. If
   * exactly one joined relation has an {@link Attr} with this name, then the
   * prefix will be set to the relation name.
   *
   * Must run after {@link BoundTransform#_fieldTransformAddRelationPKs}.
   * Must run before {@link BoundTransform#_fieldTransformNameForDatabase}.
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldTransformQualifyRelationAttrs: function(field) {
    var parts = field.split('.').reverse();
    var association = parts.slice(1).reverse().join('.');
    var modelHasAttr = attr(this._model, field);
    if (!association && !modelHasAttr) {
      var associations = this._joinedAssociationsWithAttr(field);
      if (associations.length > 1) {
        var quoted = _.map(associations, _.ary(_.str.quote, 1));
        var joined = _.str.toSentenceSerial(quoted, ', ');
        throw new Error(util.format(
          'Ambiguous attribute %j found in relations %s', field, joined));
      }
      if (associations.length) {
        parts[1] = associations[0];
      }
    }
    return parts.reverse().join('.');
  },

  /**
   * Check fields used in a query to make sure that they're actually defined
   * on the model (or relationship). Throw an error if they don't.
   *
   * Must run after {@link BoundTransform#_fieldTransformQualifyRelationAttrs}.
   * Must run before {@link BoundTransform#_fieldTransformToDatabaseName}.
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldTransformVerify: function(field) {
    var parts = field.split('.').reverse();
    var name = parts[0];
    var association = parts.slice(1).reverse().join('.');
    var modelClass = this._model;
    if (association &&
      this._joinedRelations &&
      this._joinedRelations[association]) {

      modelClass = this._joinedRelations[association]
        .relation.relatedModelClass;
    }
    else if (association) {
      modelClass = undefined; // just a table name, allow any attributes
    }

    if (name === '*') {} // allowed
    else if (modelClass && !attr(modelClass, name)) {
      throw new Error(util.format(
        'Invalid field %j in %s query. Could not find %j in %s class.',
        field, this._model.__identity__.__name__, name,
        modelClass.__identity__.__name__));
    }

    return field;
  },

  /**
   * Transforms each of the field's names into the actual database field name.
   *
   * It will use the relevant model class to look up the `<name>Attr` to use as
   * the database field name. Three outcomes are possible:
   *
   * 1. If there is currently no prefix on the field name, then the field
   *    name lookup will occur on the model that this query is bound to.
   *
   * 2. If there is a prefix and it matches a relation on the model this
   *    query is bound to, then field lookup will occur on that related model.
   *
   * 3. If there is a prefix and no relations match, then no transformation
   *    will occur.
   *
   * Must run after {@link BoundTransform#_fieldTransformQualifyRelationAttrs}.
   * Must run before {@link BoundTransform#_fieldTransformAssociationsToTables}.
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldTransformToDatabaseName: function(field) {
    var parts = field.split('.').reverse();
    var name = parts[0];
    var table = parts.slice(1).reverse().join('.');
    var association = table;
    var relation = association &&
      this._joinedRelations &&
      this._joinedRelations[association] &&
      this._joinedRelations[association].relation;

    if (name === '*') { } // no transform
    else if (relation) {
      name = attr(relation.relatedModelClass, name);
    }
    else if (table) { } // do not make transformations if table was specified
    else {
      name = attr(this._model, name);
    }

    parts[0] = name;

    return parts.reverse().join('.');
  },

  /**
   * Transforms each of the relation names into actual table names. It attempts
   * to transform any field prefix into a table name by looking using the
   * prefix to look up relationships on the current model.
   *
   * Must run after {@link BoundTransform#_fieldTransformQualifyRelationAttrs}.
   * Must run before {@link BoundTransform#_fieldTransformQualifyTable}.
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldTransformAssociationsToTables: function(field) {
    var parts = field.split('.').reverse();
    var table = parts.slice(1).reverse().join('.');
    var association = table;
    var joinDetails = association &&
      this._joinedRelations &&
      this._joinedRelations[association];

    if (joinDetails) {
      parts.splice(1, parts.length, joinDetails.as);
    }
    return parts.reverse().join('.');
  },

  /**
   * Transform a field name to a fully qualified name by prepending the table
   * name if joins are being used and the database field is not already
   * qualified with a table name.
   *
   * Must run after {@link BoundTransform#_fieldTransformQualifyRelationAttrs}.
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldTransformQualifyTable: function(field) {
    if (_.size(this._joins) === 0) { return field; }
    var parts = field.split('.').reverse();
    if (parts.length < 2) {
      parts[1] = this._model.tableName;
    }
    return parts.reverse().join('.');
  },

  /**
   * Get the names of joined associations that use a specific field name as an
   * attribute on their related model class.
   *
   * @method
   * @private
   * @param {String} field The field/attribute name.
   * @return {Array.<String>} An array of associations (relation key paths).
   */
  _joinedAssociationsWithAttr: function(field) {
    return _(this._joinedRelations)
      .mapValues('relation')
      .mapValues('relatedModelClass')
      .pick(function(model) { return attr(model, field); })
      .keys()
      .value();
  },

});
