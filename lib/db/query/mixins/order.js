'use strict';

var Mixin = require('../../../util/mixin');

/**
 * Order support for queries.
 *
 * @mixin Order
 */
module.exports = Mixin.create(/** @lends Order# */{
  init: function() {
    this._super();
    this._order = [];
  },

  _take: function(orig) {
    this._super(orig);
    this._order = orig._order.slice(0);
  },

  /**
   * Documentation forthcoming.
   *
   * @param {...String} order The order in which to return results.
   * @return {ChainedQuery} The newly configured query.
   */
  order: function() {
    var dup = this._dup();
    var args = Array.prototype.slice.call(arguments);
    var orders = args.map(function(order) {
      var match = order.match(/^(-)?(.*)$/);
      var direction = match[1] ? 'desc' : 'asc';
      return { direction: direction, field: match[2] };
    });
    dup._order = dup._order.concat(orders);
    return dup;
  },

  /**
   * Alias of {@link Order#order}.
   */
  orderBy: function() {
    this.order.apply(this, arguments);
  }
});
