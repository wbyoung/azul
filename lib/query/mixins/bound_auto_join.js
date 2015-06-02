'use strict';

var _ = require('lodash');
var util = require('util');
var Mixin = require('corazon/mixin');
var Condition = require('../../condition'), w = Condition.w;


/**
 * Simple override wrapper function to ensure that a method only will be called
 * when the current query is bound to a model.
 *
 * @function ModelAutoJoin~override
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
 * Model query mixin for automatic joining based on field strings.
 *
 * This mixin relies on external functionality:
 *
 *   - It relies on properties & functionality from {@link ModelCore}.
 *   - It relies on properties of {@link ModelJoin}. Reference that mixin for
 *     code & documentation.
 *
 * @mixin ModelAutoJoin
 */
module.exports = Mixin.create(/** @lends ModelAutoJoin# */ {

  /**
   * Override of {@link Where#where}.
   *
   * Add joins by looking at the conditions and finding any that have a field
   * prefix that matches a relation on the model. Joins any that have not yet
   * been joined.
   *
   * @method
   * @private
   * @return {BoundQuery} The newly transformed query.
   */
  where: override(function() {
    var condition = w.apply(null, arguments);
    var result = condition.reduceFields(function(query, name) {
      return query._transformAutoJoinField(name);
    }, this);
    return this._super.unbound.apply(result, arguments);
  }),

  /**
   * Override of {@link Order#order}.
   *
   * Add joins by looking at the order by and finding any that have a field
   * prefix that matches a relation on the model. Joins any that have not yet
   * been joined.
   *
   * @method
   * @private
   * @return {BoundQuery} The newly transformed query.
   */
  order: override(function() {
    var result = _.reduce(this._toOrder(arguments), function(query, order) {
      return query._transformAutoJoinField(order.field);
    }, this);
    return this._super.unbound.apply(result, arguments);
  }),

  /**
   * Override of {@link GroupBy#groupBy}.
   *
   * Add joins by looking at the group by and finding any that have a field
   * prefix that matches a relation on the model. Joins any that have not yet
   * been joined.
   *
   * @method
   * @private
   * @return {BoundQuery} The newly transformed query.
   */
  groupBy: override(function(groupBy) {
    var result = this._transformAutoJoinField(groupBy);
    return this._super.unbound.apply(result, arguments);
  }),

  /**
   * Add joins by looking at the association prefix on the field. Joins any
   * that have not yet been joined. In a typical relationship setup with
   * authors, articles, and comments, this will handle cases like:
   *
   *     author.email (joins author)
   *     article.author.name (joins article.author)
   *     author (joins author)
   *
   * @method
   * @private
   * @param {String} field The field name with association prefix.
   * @return {BoundQuery} The newly transformed query.
   */
  _transformAutoJoinField: function(field) {
    var dup = this._dup();
    var parts = field.split('.');
    var association, completed;

    // we need to give this the full field string (i.e. article.blog.title)
    // rather than lopping of the last part & using what we think could be the
    // association string (i.e. remove title from above) because the field
    // given to us here could actually just refer to an association rather than
    // an attribute (i.e. article.blog).
    // we catch all errors here & consider that to be safe since we'll be
    // re-throwing in the event that we failed to iterate through the field as
    // far as we would like.
    try {
      this._relationForEach(field, function(assoc, relation, detials) {
        association = assoc;
        completed = detials.index + 1;
      });
    }
    catch (e) {
      if (e.code !== 'RELATION_ITERATION_FAILURE') { throw e; }
    }

    // if we did not iterate through and complete at least the number of
    // parts that contribute to the table/association name (the minus one
    // is so we exclude the field), then this is an error. note that we could
    // end up iterating through all parts (when the field refers to a
    // relation object).
    if (completed < parts.length - 1) {
      var relationship = parts.slice(0, completed+1).join('.');
      var missing = parts.slice(completed)[0];
      throw new Error(util.format(
        'Invalid relationship %j in %s query. Could not find %j.',
        relationship, this._model.__identity__.__name__, missing));
    }

    if (dup._joins[association] || dup._joinedRelations[association]) {
      association = null;
    }

    return association ? dup.join(association).unique() : dup;
  },

});
