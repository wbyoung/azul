'use strict';

var Mixin = require('../util/mixin');

/**
 * Phrasing mixin for fragment related phrases.
 *
 * This mixin separates some of the logic of {@link Phrasing} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends Phrasing# */ {

  /**
   * Create where fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {Condition} condition
   * @return {Fragment} The fragment.
   */
  where: function(condition) {
    return this._grammar.join([
      'WHERE', ' ', condition.build(this._grammar, this._translator)
    ]);
  },

  /**
   * Create limit fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {Integer} limit
   * @return {Fragment} The fragment.
   */
  limit: function(limit, offset) {
    var fragments = ['LIMIT', ' ', limit];
    if (offset) {
      fragments.push(' ', 'OFFSET', ' ', offset);
    }
    return this._grammar.join(fragments);
  },

  /**
   * @typedef {Object} Phrasing~OrderSpec
   * @property {String} field The field name to order by.
   * @property {String} direction Either `asc` or `desc`.
   */

  /**
   * Create order fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {Array.<Phrasing~OrderSpec>} orderSpecifications
   * @return {Fragment} The fragment.
   */
  order: function(orderSpecifications) {
    var quote = this._grammar.field.bind(this._grammar);
    var delimit = this._grammar.delimit.bind(this._grammar);
    var join = this._grammar.join.bind(this._grammar);
    var orderings = orderSpecifications.map(function(order) {
      return join([quote(order.field), ' ', order.direction.toUpperCase()]);
    });
    var fragments = ['ORDER BY '].concat(delimit(orderings));
    return join(fragments);
  },

  /**
   * Create join fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {Object} join
   * @param {String} join.table
   * @param {Condition} join.condition
   * @param {String} join.type One of `inner`, `left`, `right`, or `full`.
   * @return {Fragment} The fragment.
   */
  join: function(join) {
    var quote = this._grammar.field.bind(this._grammar);
    var fragments = [join.type.toUpperCase(), ' JOIN ', quote(join.table)];
    if (join.alias) {
      fragments.push(' ', quote(join.alias));
    }
    if (join.condition) {
      fragments.push(' ON ', join.condition.build(
        this._grammar,
        this._translator));
    }
    else {
      fragments.push(' ON TRUE');
    }
    return this._grammar.join(fragments);
  }

});
