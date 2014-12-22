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
    // TODO: refactor
    
    var path = association.split('.');
    var assoc = [];
    var relation;
    var modelClass = this._model;
    var context = this._relationCallContext;

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

});
