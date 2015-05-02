'use strict';

var _ = require('lodash');
var util = require('util');
var Mixin = require('../util/mixin');
var SelectQuery = require('./select');

/**
 * ModelQuery mixin for automatic joining based on field strings.
 *
 * This mixin relies on external functionality:
 *
 *   - It relies on properties of the ModelQuery Join mixin. Reference that
 *     mixin for code & documentation.
 *   - It must be mixed in after the ModelQuery field transformation mixin so
 *     that it overrides those methods & can perform its actions first.
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
    this._autoJoinComplete = false;
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
    this._autoJoinComplete = orig._autoJoinComplete;
  },

  /**
   * Override of {@link BoundQuery#_spawn}. Performs automatic joining from
   * field names.
   *
   * @method
   * @private
   * @see {@link BoundQuery#_spawn}
   */
  _spawn: function(type) {
    var result;
    var isSelect = type instanceof SelectQuery.__metaclass__;
    if (isSelect && !this._autoJoinComplete) {
      result = this._transformAutoJoin();
      result = result._spawn.apply(result, arguments);
    }
    else {
      result = this._super.apply(this, arguments);
    }
    return result;
  },

  /**
   * Add joins by looking at the query and finding uses of field prefixes that
   * match a relation on the model. Uses {@link ModelQuery#join} to join any
   * that have not yet been joined.
   *
   * @method
   * @private
   * @return {ModelQuery} The newly transformed query.
   */
  _transformAutoJoin: function() {
    var dup = this._dup();
    dup = dup._transformAutoJoinFromConditions();
    dup = dup._transformAutoJoinFromOrderBy();
    dup = dup._transformAutoJoinField(dup._groupBy);
    dup._autoJoinComplete = true;
    return dup;
  },

  /**
   * Add joins by looking at the conditions and finding any that have a field
   * prefix that matches a relation on the model. Joins any that have not yet
   * been joined.
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
        return query._transformAutoJoinField(name);
      }, dup);
    }
    return dup;
  },

  /**
   * Add joins by looking at the order by and finding any that have a field
   * prefix that matches a relation on the model. Joins any that have not yet
   * been joined.
   *
   * @method
   * @private
   * @return {ModelQuery} The newly transformed query.
   */
  _transformAutoJoinFromOrderBy: function() {
    return _.reduce(this._order, function(query, order) {
      return query._transformAutoJoinField(order.field);
    }, this._dup());
  },

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
   * @return {ModelQuery} The newly transformed query.
   */
  _transformAutoJoinField: function(field) {
    if (!field) { return this._dup(); }

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
