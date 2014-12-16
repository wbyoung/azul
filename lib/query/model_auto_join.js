'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');
var SelectQuery = require('./select');

/**
 * ModelQuery mixin for automatic joining based on field strings.
 *
 * This mixin relies on external functionality:
 *
 *   - It relies on properties of the ModelQuery Join mixin. Reference that
 *     mixin for code & documentation.
 *   - It must be mixed in after the ModelQuery Introspection mixin.
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
   * @see {@link BoundQuery#all}
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
    var dup = this._dup();
    var orders = dup._order;
    if (orders) {
      dup = _.reduce(orders, function(query, order) {
        return query._transformAutoJoinField(order.field);
      }, dup);
    }
    return dup;
  },

  /**
   * Add joins by looking at the association prefix on the field. Joins any
   * that have not yet been joined.
   *
   * @method
   * @private
   * @param {String} field The field name with association prefix.
   * @return {ModelQuery} The newly transformed query.
   */
  _transformAutoJoinField: function(field) {
    var dup = this._dup();
    var parts = field.split('.').reverse();
    var association = parts.slice(1).reverse().join('.');
    if (association && !dup._joinedRelations[association]) {
      try { dup = dup.join(association); }
      catch (e) {}
    }
    return dup;
  },

});
