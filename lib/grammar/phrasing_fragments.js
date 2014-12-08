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
   * Documentation forthcoming.
   *
   * @method
   * @public
   * @return {Fragment} The where fragment.
   */
  where: function(condition) {
    return this._grammar.join([
      'WHERE', ' ', condition.build(this._grammar, this._translator)
    ]);
  },

  /**
   * Documentation forthcoming.
   *
   * @method
   * @public
   * @return {Fragment} The limit fragment.
   */
  limit: function(limit) {
    return this._grammar.join(['LIMIT', ' ', limit]);
  },

  /**
   * Documentation forthcoming.
   *
   * @method
   * @public
   * @return {Fragment} The order fragment.
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
   * Documentation forthcoming.
   *
   * @method
   * @public
   * @return {Fragment} The join fragment.
   */
  join: function(join) {
    var quote = this._grammar.field.bind(this._grammar);
    var fragments = [join.type.toUpperCase(), ' JOIN ', quote(join.table)];
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
