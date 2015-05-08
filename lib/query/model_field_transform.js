'use strict';

var _ = require('lodash');
var util = require('util');
var Mixin = require('../util/mixin');

_.str = require('underscore.string');

/**
 * Look up a database field name.
 *
 * @function ModelQuery~attr
 * @private
 * @param {Class} modelClass The model class on which to perform the lookup.
 * @param {String} name The attribute name to look up.
 * @return {String} The database field name.
 */
var attr = function(modelClass, name) {
  return modelClass && modelClass.__class__.prototype[name + 'Attr'];
};

/**
 * ModelQuery mixin for transformation of field strings.
 *
 * This mixin relies on external functionality:
 *
 *   - It relies on properties of the ModelQuery Join mixin. Reference that
 *     mixin for code & documentation.
 *   - It must be mixed in before the ModelQuery AutoJoin mixin.
 *
 * This mixin separates some of the logic of {@link ModelQuery} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends ModelQuery# */ {

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   */
  _create: function() {
    this._super.apply(this, arguments);
    this._transformedFields = false;
  },

  /**
   * Duplication implementation.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._transformedFields = orig._transformedFields;
  },

  /**
   * Override of {@link BoundQuery#_spawn}. Performs all necessary field
   * transformations, i.e., prepending the table name to each of the fields in
   * the query's condition.
   *
   * @method
   * @private
   * @see {@link BoundQuery#_spawn}
   */
  _spawn: function(type, args) {
    var method = '_configureFor' + type.__name__.replace(/Query$/, '');
    var result;
    if (this[method] && !this._transformedFields) {
      args = _.toArray(args);
      result = this._dup();
      result._transformedFields = true;
      this[method](result, args);
      result = result._spawn.apply(result, [type, args]);
    }
    else {
      result = this._super.apply(this, arguments);
    }
    return result;
  },

  /**
   * Configure a duplicate, applying all transformations required for a select
   * query.
   *
   * Also transforms arguments that will be sent to {@link SelectQuery#_create}
   * when spawning a new select query.
   *
   * Destructively alters the `dup` query.
   *
   * @method
   * @private
   * @param {ModelQuery} dup The duplicated query to transform.
   * @param {Array} args The arguments to transform.
   */
  _configureForSelect: function(dup, args) {
    // the second argument when creating a select query is the array of columns
    // to select. these need to be transformed.
    args[1] = this._transformColumns(args[1]);
    dup._where = dup._where && dup._transformWhere(dup._where);
    dup._order = dup._transformOrderBy(dup._order);
    dup._groupBy = dup._fieldTransform(dup._groupBy);
  },

  /**
   * Configure a duplicate, applying all transformations required for a insert
   * query.
   *
   * Also transforms arguments that will be sent to {@link SelectQuery#_create}
   * when spawning a new insert query.
   *
   * Destructively alters the `dup` query.
   *
   * @method
   * @private
   * @param {ModelQuery} dup The duplicated query to transform.
   * @param {Array} args The arguments to transform.
   */
  _configureForInsert: function(dup, args) {
    // the second argument when creating a insert query is the values being
    // inserted. these need to be transformed.
    var values = _.isArray(args[1]) ? args[1] : [args[1]];
    args[1] = values.map(function(values) {
      return this._transformValuesObject(values);
    }, this);
  },

  /**
   * Configure a duplicate, applying all transformations required for an update
   * query.
   *
   * Also transforms arguments that will be sent to {@link UpdateQuery#_create} when
   * spawning a new update query.
   *
   * Destructively alters the `dup` query.
   *
   * @method
   * @private
   * @param {ModelQuery} dup The duplicated query to transform.
   * @param {Array} args The arguments to transform.
   */
  _configureForUpdate: function(dup, args) {
    // the second argument when creating an update query is the values to set.
    // these need to be transformed.
    args[1] = this._transformValuesObject(args[1]);
    dup._where = dup._where && dup._transformWhere(dup._where);
  },

  /**
   * Configure a duplicate, applying all transformations required for a delete
   * query.
   *
   * Destructively alters the `dup` query.
   *
   * @method
   * @private
   * @param {ModelQuery} dup The duplicated query to transform.
   * @param {Array} args The arguments to transform.
   */
  _configureForDelete: function(dup/*, args*/) {
    dup._where = dup._where && dup._transformWhere(dup._where);
  },

  /**
   * Transforms all field names within columns to their appropriate values
   * taking into account the current model and joined relations.
   *
   * @method
   * @private
   * @param {Array.<String>} columns The columns to transform.
   * @return {Array.<String>} The new columns to select.
   */
  _transformColumns: function(columns) {
    columns = columns || ['*'];
    columns = columns.map(function(field) {
      return this._fieldTransform(field);
    }, this);
    return columns;
  },

  /**
   * Transform fields within a _values_ object. This applies transformations to
   * the keys of the object. An object with fields as its keys would be used
   * both for insert and update style queries.
   *
   * @param {Object} values The values to transform.
   * @return {Object} An object with the same values, but with the property
   * names transformed.
   */
  _transformValuesObject: function(values) {
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
  _transformWhere: function(condition) {
    return condition.transformExpressions(function(predicate, field, value) {
      return [
        this._fieldTransform(field),
        this._valueTransform(field, value)
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
    if (!field) { return undefined; }

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
    if (!field) { return undefined; }

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
   * Must run before {@link ModelQuery#_fieldTransformQualifyRelationAttrs}.
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldTransformRelationToPrimaryKey: function(field) {
    return this._joinedRelations[field] ? [field, 'pk'].join('.') : field;
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
    return this._joinedRelations[field] ? value.pk : value;
  },

  /**
   * Add a relation name prefix when appropriate.
   *
   * When a prefix is absent, and the current field does not specify a table or
   * relation, then a search is done for a relation with this field name. If
   * exactly one joined relation has an {@link Attr} with this name, then the
   * prefix will be set to the relation name.
   *
   * Must run after {@link ModelQuery#_fieldTransformAddRelationPKs}.
   * Must run before {@link ModelQuery#_fieldTransformNameForDatabase}.
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
        var quoted = _.map(associations, function(s) { return _.str.quote(s); });
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
   * Must run after {@link ModelQuery#_fieldTransformQualifyRelationAttrs}.
   * Must run before {@link ModelQuery#_fieldTransformToDatabaseName}.
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
    if (association && this._joinedRelations[association]) {
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
   * Must run after {@link ModelQuery#_fieldTransformQualifyRelationAttrs}.
   * Must run before {@link ModelQuery#_fieldTransformAssociationsToTables}.
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
   * Must run after {@link ModelQuery#_fieldTransformQualifyRelationAttrs}.
   * Must run before {@link ModelQuery#_fieldTransformQualifyTable}.
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
    var joinDetails = association && this._joinedRelations[association];
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
   * Must run after {@link ModelQuery#_fieldTransformQualifyRelationAttrs}.
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
