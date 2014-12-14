'use strict';

var _ = require('lodash');
var util = require('util');
var BoundQuery = require('./bound');
var SelectQuery = require('./select');
var BluebirdPromise = require('bluebird');

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
 * A query bound to a specific model class.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link EntryQuery#bindModel}.
 *
 * @protected
 * @constructor ModelQuery
 * @extends BoundQuery
 */
var ModelQuery = BoundQuery.extend(/** @lends ModelQuery# */ {
  init: function() { throw new Error('ModelQuery must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @param {Class} model The model class to lock in / bind to this query.
   * @see {@link BaseQuery#_create}
   */
  _create: function(model) {
    this._super(model.tableName);
    this._model = model;
    this._prefetches = [];
    this._joinedRelations = {};
    this._transformsForSelectApplied = false;
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
    this._model = orig._model;
    this._prefetches = orig._prefetches.slice(0);
    this._joinedRelations = _.clone(orig._joinedRelations);
    this._transformsForSelectApplied = orig._transformsForSelectApplied;
  },

  /**
   * Override of {@link BaseQuery#_spawn}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_spawn}
   */
  _spawn: function(type) {
    if (this._prefetches.length) {
      this._validateSpawn(type, 'with', [SelectQuery]);
    }
    return this._super.apply(this, arguments);
  },

  /**
   * Override of {@link BaseQuery#_execute}. Performs a pre-fetch after the
   * execution.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_execute}
   */
  _execute: function() {
    return this._super()
      .tap(this._prefetch.bind(this));
  },

  /**
   * Perform all necessary pre-fetches.
   *
   * @method
   * @private
   * @param {Array.<Model>} records The records for which to pre-fetch.
   * @return {Promise} A promise that will resolve when the pre-fetch has
   * completed.
   */
  _prefetch: function(records) {
    return BluebirdPromise.map(this._prefetches, function(relation) {
      return relation.prefetch(records);
    });
  },

  /**
   * Override of {@link BoundQuery#all}. Performs all necessary field
   * transformations, i.e., prepending the table name to each of the fields in
   * the query's condition. Also performs automatic joining from field names.
   *
   * @method
   * @private
   * @see {@link BoundQuery#all}
   */
  all: function() {
    return !this._transformsForSelectApplied ?
      this._transformForSelect().all() :
      this._super.apply(this, arguments);
  },

  /**
   * Apply all transformations required for a select query.
   *
   * @method
   * @private
   * @return {ModelQuery} The newly transformed query.
   */
  _transformForSelect: function() {
    var dup = this
      ._transformAutoJoinFromConditions()
      ._transformWhere()
      ._dup();

    dup._transformsForSelectApplied = true;

    return dup;
  },

  /**
   * Add joins by looking at the conditions and finding any that have a field
   * prefix that matches a relation on the model. Uses {@link ModelQuery#join}
   * to join any that have not yet been joined.
   *
   * @method
   * @private
   * @return {ModelQuery} The newly transformed query.
   */
  _transformAutoJoinFromConditions: function() {
    var prototype = this._model.__class__.prototype;
    var dup = this._dup();
    var condition = dup._where;
    if (condition) {
      dup = condition.reduceFields(function(query, name) {
        var parts = name.split('.').reverse();
        var association = parts[1];
        var relation = prototype[association + 'Relation'];
        if (relation && !dup._joinedRelations[association]) {
          query = query.join(association);
        }
        return query;
      }, dup);
    }
    return dup;
  },

  /**
   * Transforms all field names within conditions to their appropriate values
   * taking into account the current model and joined relations.
   *
   * @method
   * @private
   * @return {ModelQuery} The newly transformed query.
   */
  _transformWhere: function() {
    var dup = this._dup();
    if (dup._where) {
      dup._where =
        dup._where.transformFields(this._fieldTransform.bind(this));
    }
    return dup;
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
    var table = parts[1];
    var modelHasAttr = attr(this._model, field);

    if (!table && !modelHasAttr) {
      var relations = _(this._joinedRelations)
        .mapValues('relatedModelClass')
        .pick(function(model) { return attr(model, field); })
        .keys()
        .value();

      if (relations.length > 1) {
        var quoted = _.map(relations, function(s) { return _.str.quote(s); });
        var joined = _.str.toSentenceSerial(quoted, ', ');
        throw new Error(util.format(
          'Ambiguous attribute %j found in relations %s', field, joined));
      }
      if (relations.length) {
        parts[1] = relations[0];
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
    var table = parts[1];
    var association = table;
    var databaseName;
    var relation = association &&
      this._model.__class__.prototype[association + 'Relation'];

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
    var table = parts[1];
    var association = table;
    var prototype = this._model.__class__.prototype;
    var relation = association && prototype[association + 'Relation'];
    if (relation) {
      parts[1] = relation.relatedModelClass.tableName;
    }
    return parts.reverse().join('.');
  },

  /**
   * Transform a field name to a fully qualified name by prepending the table
   * name if the database field is not already qualified with a table name.
   *
   * Must run after {@link ModelQuery#_fieldTransformAddRelations}.
   *
   * @method
   * @private
   * @param {String} field The field to transform.
   * @return {String} The transformed value.
   */
  _fieldTransformQualifyTable: function(field) {
    var parts = field.split('.').reverse();
    if (parts.length < 2) {
      parts[1] = this._model.tableName;
    }
    return parts.reverse().join('.');
  },

  /**
   * Pre-fetch related objects.
   *
   * @method
   * @public
   * @param {String} association The name of the relation to pre-fetch.
   * @return {ChainedQuery} The newly configured query.
   */
  with: function(association) {
    var dup = this._dup();
    var prototype = this._model.__class__.prototype;
    var relation = prototype[association + 'Relation'];
    if (!relation) {
      throw new Error(util.format(
        'No relation %j found for `with` on %s query.',
        association, this._model.__identity__.__name__));
    }
    dup._prefetches.push(relation);
    return dup;
  },

  /**
   * Override of {@link Join#join}. Handles joins that specify a model with
   * which to join. If this does not appear to be a join for a model, then the
   * standard {@link Join#join} will be called.
   *
   * In the case where you're using trying to use a table name, but it is also
   * the name of an association on your model, this method will recognize that
   * you've passed multiple arguments (as required by {@link Join#join}) and
   * will not use the association.
   *
   * @method
   * @public
   * @param {String} association The name of the relation to join.
   * @see {@link Join#join}
   */
  join: function(/*association*/) {
    var dup;
    if (arguments.length === 1) {
      var association = arguments[0];
      var prototype = this._model.__class__.prototype;
      var relation = prototype[association + 'Relation'];
      if (!relation) {
        throw new Error(util.format(
          'No relation %j found for `join` on %s query.',
          association, this._model.__identity__.__name__));
      }

      dup = relation.join(this)._dup();
      dup._joinedRelations[association] = relation;
    }

    return dup || this._super.apply(this, arguments);
  },

  /**
   * Convenience method for finding objects by primary key. Essentially, this
   * just does the following:
   *
   *     query.where({ pk: pk }).limit(1).fetchOne()
   *
   * @method
   * @public
   * @param {Integer|?} pk The primary key of the object to find.
   * @return {Promise} A promise resolves with the found object.
   */
  find: function(pk) {
    return this.where({ pk: pk }).limit(1).fetchOne();
  }

});

module.exports = ModelQuery.reopenClass({ __name__: 'ModelQuery' });
