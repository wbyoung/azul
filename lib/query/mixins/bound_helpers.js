'use strict';

var _ = require('lodash');
var util = require('util');
var Mixin = require('corazon/mixin');

/**
 * Model query mixin for helper methods.
 *
 * This mixin relies on external functionality:
 *
 *   - It relies on properties & functionality from {@link ModelCore}.
 *
 * @mixin BoundHelpers
 */
module.exports = Mixin.create(/** @lends BoundHelpers# */ {

  /**
   * @typedef {Object} BoundHelpers~RelationIterationDetails
   * @property {Integer} index The index in the association string or -1 if it
   * is a through relation.
   * @property {Relation} [through] The through relation from which this
   * association/relation originates.
   * @property {Boolean} [expanded] This option is present when the `through`
   * option is present, and is true when the association is for is an expansion
   * of a `through` relation & not actually part of the given association
   * string.
   * @property {Boolean} [source] This option is present when the `through`
   * option is present, and is true when the relation is the _source_ relation
   * of the through relation.
   */

  /**
   * @function BoundHelpers~RelationIterator
   * @param {String} association The path to this association.
   * @param {Relation} relation The relation for this association.
   * @param {Object} BoundHelpers~RelationIterationDetails
   */

  /**
   * Iterate through an association string (a key path for a relationship)
   * while taking into account expanded relationships. Expanded relationships
   * will referred to simply as _through_ relationships in the documentation of
   * this method, but could possibly be used in other ways.
   *
   * The _source_ of a _through_ relation will actually cause two invocations
   * of the callback function to occur. The first will be with the fully
   * expanded association name. The second will be with the _through_
   * association name used in the given association string. The first one will
   * have the `expanded` detail flag set, and the second one will not.
   *
   * @method
   * @private
   * @param {String} association Relation key path.
   * @param {BoundHelpers~RelationIterator} fn The callback function.
   * @param {Object} thisArg The value of `this` for the callback function.
   */
  _relationForEach: function(association, fn, thisArg) {
    var path = association.split('.');
    var assoc = [];
    var modelClass = this._model;

    path.forEach(function(name, index) {
      var relation = modelClass.__class__.prototype[name + 'Relation'];
      if (!relation) {
        throw this._relationIterationError(association, name);
      }

      var expanded = relation.expand();
      if (expanded) {
        assoc.push(name);
        this._expandedRelationForEach(assoc.join('.'),
          relation, expanded, fn, thisArg);
      }
      else {
        assoc.push(name);
        fn.call(thisArg, assoc.join('.'), relation, {
          index: index,
        });
      }

      // get model class for next iteration
      modelClass = relation.relatedModelClass;
    }, this);
  },

  /**
   * Create an error for a missing relation during relation iteration.
   *
   * @param {String} association Relation key path.
   * @param {String} name The name that caused the error.
   * @return {Error} The error object.
   */
  _relationIterationError: function(association, name) {
    var context = this._relationCallContext;
    var through = association.indexOf('.') !== -1 ?
      util.format(' through %s', association) : '';
    return _.extend(new Error(util.format(
      'No relation %j found for `%s` on %s query%s.',
      name, context, this._model.__identity__.__name__, through)), {
      code: 'RELATION_ITERATION_FAILURE',
    });

  },

  /**
   * Enumerate an expanded (a.k.a. _through_) relation. This is a helper for
   * {@link BoundHelpers#_relationForEach} and should not be used directly.
   *
   * Calls the callback with arguments compatible with
   * {@link BoundHelpers#_relationForEach}.
   *
   * Each relation in the through relation will cause the callback to be
   * called. Each call will have the following details set: `through` will be
   * the association given to this method, `expanded` will be true, `index`
   * will be -1, and `source` will be true for the last through relation, the
   * _source_ relation. Each of these calls will use the expanded association
   * name, that is the name from each of the _non-through_ relations.
   *
   * Finally, the callback will be called again with the _source_ relation, but
   * will use the _through_ association name instead of the expanded
   * association name and the actual index in the association string. The
   * `expanded` option will be false and the `source` option true. The
   * `through` option will be set to the same value as the previous invocation.
   *
   * @method
   * @private
   *
   * @param {String} association Relation key path.
   * @param {Relation} rel The through relation that's been expanded.
   * @param {Array.<Relation>} expanded The expanded relations to iterate.
   * @param {BoundHelpers~RelationIterator} fn The callback function.
   * @param {Object} thisArg The value of `this` for the callback function.
   */
  _expandedRelationForEach: function(association, rel, expanded, fn, thisArg) {
    var assoc = association.split('.');
    var index = assoc.length - 1;
    var sourceRelation = _.last(expanded);
    var expandedAssoc = assoc.slice(1);

    expanded.forEach(function(rel) {
      expandedAssoc.push(rel._name);
      fn.call(thisArg, expandedAssoc.join('.'), rel, {
        through: rel,
        expanded: true,
        source: (rel === sourceRelation),
        index: -1,
      });
    });

    fn.call(thisArg, assoc.join('.'), sourceRelation, {
      through: rel,
      expanded: false,
      source: true,
      index: index,
    });
  },

});
