'use strict';

var _ = require('lodash');
var util = require('util');
var Mixin = require('../util/mixin');

/**
 * ModelQuery mixin for helper methods.
 *
 * This mixin relies on external functionality:
 *
 *   - It relies on properties of the ModelQuery. Reference that mixin for code
 *     & documentation.
 *
 * This mixin separates some of the logic of {@link ModelQuery} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends ModelQuery# */ {

  /**
   * @function ModelQuery~RelationIterator
   * @param {String} association The path to this association.
   * @param {Relation} relation The relation for this association.
   * @param {Integer} index The index in the association string or -1 if it is
   * a through relation.
   */

  /**
   * Iterate through an association string (a key path for a relationship)
   * while taking into account through relationships.
   *
   * @method
   * @private
   * @param {String} association Relation key path.
   * @param {ModelQuery~RelationIterator} fn The callback function.
   * @param {Object} thisArg The value of `this` for the callback function.
   */
  _relationForEach: function(association, fn, thisArg) {
    var path = association.split('.');
    var assoc = [];
    var relation;
    var modelClass = this._model;
    var context = this._relationLookupFailureReason || 'untracked-method';

    path.forEach(function(name, index) {
      relation = modelClass.__class__.prototype[name + 'Relation'];
      modelClass = relation && relation.relatedModelClass;

      if (!relation) {
        var through = association.indexOf('.') !== -1 ?
          util.format(' through %s', association) : '';
        throw new Error(util.format(
          'No relation %j found for `%s` on %s query%s.',
          name, context, this._model.__identity__.__name__, through));
      }

      if (relation._options.through) { // TODO: REMOVE PRIVATE ACCESS
        var throughRelations = relation._throughRelations(); // TODO: REMOVE PRIVATE ACCESS
        var sourceRelation = _.first(throughRelations);
        throughRelations.slice(1).reverse().forEach(function(rel) {
          fn.call(thisArg, assoc.concat([rel._name]).join('.'), rel, relation, -1);
        });

        assoc.push(name);
        fn.call(thisArg, assoc.join('.'), sourceRelation, relation, index);
        relation = sourceRelation;
      }
      else {
        assoc.push(name);
        fn.call(thisArg, assoc.join('.'), relation, null, index);
      }

    }, this);
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

});
