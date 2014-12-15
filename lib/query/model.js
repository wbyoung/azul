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
   * @typedef {Array.<ModelQuery~PrefetchChain>} ModelQuery~PrefetchArray
   * @see {@link ModelQuery#_prefetch}
   */

  /**
   * Perform all necessary pre-fetches.
   *
   * Uses the `_prefetches` array, a {@link ModelQuery~PrefetchArray} to
   * pre-fetch all relations that were specified via `with`. This method really
   * just kicks off the start of a {@link ModelQuery#_prefetchChain} using the
   * records that was passed to it.
   *
   * @method
   * @private
   * @param {Array.<Model>} records The records for which to pre-fetch.
   * @return {Promise} A promise that will resolve when the pre-fetch has
   * completed.
   * @see {@link ModelQuery~PrefetchArray}
   */
  _prefetch: function(records) {
    var self = this;
    var fn = function(chain) { return self._prefetchChain(chain, records); };
    return BluebirdPromise.map(this._prefetches, fn);
  },

  /**
   * @typedef {Array.<Relation>} ModelQuery~PrefetchChain
   * @see {@link ModelQuery#_prefetchChain}
   */

  /**
   * Pre-fetch records through a chain of relations.
   *
   * Handles an array of relations that should be prefetched, one after the
   * other. Each relation will have it's `prefetch` method called. The objects
   * passed to each `prefetch` call will begin with the set of objects that
   * are given to the method (usually those returned from the execution of this
   * query). Each subsequent call will use the resulting set of objects from
   * the previous `prefetch`, creating a chain that can be used to follow a
   * chain of relationships.
   *
   * @method
   * @private
   * @param {ModelQuery~PrefetchChain} chain The chain of relations for which
   * pre-fetching should occur.
   * @param {Array.<Model>} records The records for which to pre-fetch.
   * @return {Promise} A promise that will resolve when pre-fetching has
   * completed.
   */
  _prefetchChain: function(chain, records) {
    return BluebirdPromise.reduce(chain, function(recordsFromPrevious, relation) {
      return relation.prefetch(recordsFromPrevious);
    }, records);
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
      ._transformOrderBy()
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
    var dup = this._dup();
    var condition = dup._where;
    if (condition) {
      dup = condition.reduceFields(function(query, name) {
        var parts = name.split('.').reverse();
        var association = parts.slice(1).reverse().join('.');
        if (association && !dup._joinedRelations[association]) {
          try { query = query.join(association); }
          catch (e) {}
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
   * Transforms all field names within an order by to their appropriate values
   * taking into account the current model and joined relations.
   *
   * @method
   * @private
   * @return {ModelQuery} The newly transformed query.
   */
  _transformOrderBy: function() {
    var dup = this._dup();
    if (dup._order) {
      dup._order = dup._order.map(function(order) {
        return _.extend({}, order, {
          field: this._fieldTransform(order.field)
        });
      }, this);
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
    var association = parts.slice(1).reverse().join('.');
    var modelHasAttr = attr(this._model, field);

    if (!association && !modelHasAttr) {
      var relations = _(this._joinedRelations)
        .mapValues('relation')
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
   * Iterate through an association string (a key path for a relationship).
   *
   * The callback for this and all functional methods related to associations
   * will include the current association key path as the first argument
   * (built up as it goes), the name of the current association as the second
   * argument, and the index as the third argument.
   *
   * @method
   * @private
   * @param {String} association Relation key path.
   * @param {Function} fn The callback function.
   * @param {Object} thisArg The value of `this` for the callback function.
   */
  _associationForEach: function(association, fn, thisArg) {
    var path = association.split('.');
    path.forEach(function(name, index) {
      fn.call(thisArg, path.slice(0, index+1).join('.'), name, index);
    });
  },

  /**
   * Iterate through an association string (a key path for a relationship).
   *
   * As with all reduce functions, the callback's first argument is an
   * accumulator & other arguments follow the same style as other functional
   * association methods.
   *
   * @method
   * @private
   * @param {String} association Relation key path.
   * @param {Function} fn The callback function.
   * @param {Object} accumulator The accumulator value.
   * @param {Object} thisArg The value of `this` for the callback function.
   * @see {ModelQuery#_associationForEach}
   */
  _associationReduce: function(association, fn, accumulator, thisArg) {
    this._associationForEach(association, function(joined, name, index) {
      accumulator = fn.call(thisArg, accumulator, joined, name, index);
    }, this);
    return accumulator;
  },

  /**
   * Map an association string (a key path for a relationship).
   *
   * @method
   * @private
   * @param {String} association Relation key path.
   * @param {Function} fn The callback function.
   * @param {Object} thisArg The value of `this` for the callback function.
   * @see {ModelQuery#_associationForEach}
   */
  _associationMap: function(association, fn, thisArg) {
    var iterator = function(array, joined, name, index) {
      array.push(fn.call(thisArg, joined, name, index));
      return array;
    };
    return this._associationReduce(association, iterator, [], this);
  },

  /**
   * Finds a relation by traversing the components of the association, using
   * each relation along the way to find the next relation.
   *
   * @param {String} association Relation key path.
   * @param {String} context The reason for the lookup (used in error message).
   * @return {Relation} [description]
   */
  _lookupRelation: function(association, context) {
    var iterator = function(details, assoc, name) {
      var modelClass = details.modelClass;
      var prototype = modelClass.__class__.prototype;
      var relation = prototype[name + 'Relation'];
      if (!relation) {
        var through = association.indexOf('.') !== -1 ?
          util.format(' through %s', association) : '';
        throw new Error(util.format(
          'No relation %j found for `%s` on %s query%s.',
          name, context, this._model.__identity__.__name__, through));
      }
      return { relation: relation, modelClass: relation.relatedModelClass };
    };
    var initial = { relation: null, modelClass: this._model };
    return this._associationReduce(association, iterator, initial, this).relation;
  },

  /**
   * Pre-fetch related objects.
   *
   * @method
   * @public
   * @param {...String} association The name of the relation to pre-fetch.
   * @return {ChainedQuery} The newly configured query.
   */
  with: function(/*association...*/) {
    return _.reduce(arguments, function(query, association) {
      return query._withAssociation(association);
    }, this._dup());
  },

  /**
   * Pre-fetch for a specific association.
   *
   * @param {String} association Relation key path.
   * @return {ChainedQuery} The newly configured query.
   * @see {@link ModelQuery~PrefetchArray}
   */
  _withAssociation: function(association) {
    var prefetchChain = this._associationMap(association, function(assoc) {
      return this._lookupRelation(assoc, 'with');
    }, this);

    var dup = this._dup();
    dup._prefetches.push(prefetchChain);
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
    return arguments.length === 1 ?
      this._joinAssociation(arguments[0]) :
      this._super.apply(this, arguments);
  },

  /**
   * Join a specific association.
   *
   * @param {String} association Relation key path.
   * @return {ChainedQuery} The newly configured query.
   */
  _joinAssociation: function(association) {
    // TODO: cleanup, don't really want to capture through like this, it'd be
    // nicer to handle it in the reduce/and or handle the duped query in the
    // same way as the through value.
    var through;
    return this._associationReduce(association, function(query, assoc) {
      var relation = this._lookupRelation(assoc, 'join');
      query = query._joinRelation(assoc, through, relation);
      through = assoc;
      return query;
    }, this._dup(), this);
  },

  /**
   * Whether the table name is currently used in this query.
   *
   * @method
   * @private
   * @param {String} name The name to check.
   * @return {Boolean}
   */
  _tableInQuery: function(name) {
    var result = false;
    result = result || (name === this._model.tableName);
    result = result || _.any(this._joinedRelations, function(joinDetails) {
      return joinDetails.as === name;
    });
    return result;
  },

  /**
   * Generate a unique table alias name.
   *
   * @param {String} name The base table name.
   * @return {String} The unique name.
   * @see {@link ModeQuery#_tableInQuery}
   */
  _uniqueTableAlias: function(name) {
    var alias = name;
    var n = 1;
    while (this._tableInQuery(alias)) {
      alias = name + '_j' + n;
      n+= 1;
    }
    return alias;
  },

  /**
   * Join a specific relation using a specific name.
   *
   * @param {String} name The name by which this association is referred.
   * Usually this will be an association string (a relation key path), but will
   * sometimes may be generated to avoid name conflicts.
   * @param {Relation} relation The relation to join.
   * @return {ChainedQuery} The newly configured query.
   */
  _joinRelation: function(name, through, relation) {

    // TODO: clean up this method
    var relatedTable = relation.relatedModelClass.tableName;
    var relatedTableKey = relation.foreignKey;
    var currentTable = relation.modelClass.tableName;
    var currentTableKey = relation.primaryKey;

    var throughJoinDetails = through && this._joinedRelations[through];
    if (throughJoinDetails) {
      currentTable = throughJoinDetails.as;
    }

    if (relation.__identity__.hostsForeignKey) {
      relatedTableKey = relation.primaryKey;
      currentTableKey = relation.foreignKey;
    }

    var alias;
    var joinTable = relatedTable;
    if (this._tableInQuery(relatedTable)) {
      alias = this._uniqueTableAlias(relation._name);
      joinTable = _.object([[relatedTable, alias]]);
      relatedTable = alias;
    }

    var pk = [currentTable, currentTableKey].join('.');
    var jk = [relatedTable, relatedTableKey].join('.');
    var condition = [pk, jk].join('=');

    var dup = this.join(joinTable, 'inner', condition);
    dup._joinedRelations[name] = {
      as: alias || relatedTable,
      relation: relation
    };
    return dup;
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
