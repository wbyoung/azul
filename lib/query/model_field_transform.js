'use strict';

var _ = require('lodash');
var util = require('util');
var Mixin = require('../util/mixin');
var SelectQuery = require('./select');

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
  _spawn: function(type) {
    var args = _.toArray(arguments);
    var result;
    var isSelect = type instanceof SelectQuery.__metaclass__;
    if (isSelect && !this._transformedFields) {
      // the second argument to _spawn is the array of arguments that will
      // eventually be passed to _create, in this case, creating a select
      // query, so we can alter those here.
      args[1] = this._transformSelectArgs(args[1]);
      result = this._transformQueryFields();
      result = result._spawn.apply(result, args);
    }
    else {
      result = this._super.apply(this, args);
    }
    return result;
  },

  /**
   * Transform arguments that will be sent to {@link SelectQuery#_create} when
   * spawning a new select query.
   *
   * @method
   * @private
   * @param {Array} args The arguments to transform.
   * @return {Array} The transformed arguments.
   */
  _transformSelectArgs: function(args) {
    // the second argument when creating a select query is the array of columns
    // to select, these need to be transformed.
    args = _.toArray(args);
    args[1] = this._transformColumns(args[1]);
    return args;
  },

  /**
   * Apply all transformations required for a select query.
   *
   * @method
   * @private
   * @return {ModelQuery} The newly transformed query.
   */
  _transformQueryFields: function() {
    var dup = this._dup();
    dup._where = dup._where && dup._transformWhere(dup._where);
    dup._order = dup._transformOrderBy(dup._order);
    dup._groupBy = dup._fieldTransform(dup._groupBy);
    dup._transformedFields = true;
    return dup;
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
   * Transforms all field names within a condition to their appropriate values
   * taking into account the current model and joined relations.
   *
   * @method
   * @private
   * @param {Condition} condition The condition to transform.
   * @return {Condition} The newly transformed condition.
   */
  _transformWhere: function(condition) {
    return condition.transformFields(this._fieldTransform.bind(this));
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
    field = this._fieldTransformAddRelations(field);
    field = this._fieldTransformNameForDatabase(field);
    field = this._fieldTransformRelationsToTables(field);
    field = this._fieldTransformQualifyTable(field);
    return field;
  },

  /**
   * Add a relation name prefix when appropriate.
   *
   * When a prefix is absent, and the current field does not specify a table or
   * relation, then a search is done for a relation with this field name. If
   * exactly one joined relation has an {@link Attr} with this name, then the
   * prefix will be set to the relation name.
   *
   * Must run before {@link ModelQuery#_fieldTransformNameForDatabase}.
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldTransformAddRelations: function(field) {
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
   * Must run after {@link ModelQuery#_fieldTransformAddRelations}.
   * Must run before {@link ModelQuery#_fieldTransformRelationsToTables}.
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldTransformNameForDatabase: function(field) {
    var parts = field.split('.').reverse();
    var name = parts[0];
    var table = parts.slice(1).reverse().join('.');
    var association = table;
    var databaseName;
    var relation = association &&
      this._joinedRelations[association] &&
      this._joinedRelations[association].relation;

    if (relation) {
      databaseName = attr(relation.relatedModelClass, name) || name;
    }
    else if (table) { // do not make transformations if table was specified
      databaseName = name;
    }
    else {
      databaseName = attr(this._model, name) || name;
    }

    parts[0] = databaseName;

    return parts.reverse().join('.');
  },

  /**
   * Transforms each of the relation names into actual table names. It attempts
   * to transform any field prefix into a table name by looking using the
   * prefix to look up relationships on the current model.
   *
   * Must run after {@link ModelQuery#_fieldTransformAddRelations}.
   * Must run before {@link ModelQuery#_fieldTransformQualifyTable}.
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldTransformRelationsToTables: function(field) {
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
   * Must run after {@link ModelQuery#_fieldTransformAddRelations}.
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldTransformQualifyTable: function(field) {
    if (this._joins.length === 0) { return field; }
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
