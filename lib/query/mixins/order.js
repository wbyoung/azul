'use strict';

var _ = require('lodash');
var Mixin = require('corazon/mixin');

/**
 * Order support for queries.
 *
 * @mixin Order
 */
module.exports = Mixin.create(/** @lends Order# */ {
  init: function() {
    this._super();
    this._order = [];
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
    this._order = orig._order.slice(0);
  },

  /**
   * Covert arguments to a value suitable for use in the query. Mixins may
   * override this to alter the resulting value.
   *
   * @method
   * @protected
   * @param {Array} args Order specification to convert.
   * @return {Array} The converted order items.
   */
  _toOrder: function(args) {
    return _.toArray(args).map(function(order) {
      var match = order.match(/^(-)?(.*)$/);
      var direction = match[1] ? 'desc' : 'asc';
      return { direction: direction, field: match[2] };
    });
  },

  /**
   * Order results of a query.
   *
   *     select('books').order('author', '-title')
   *     // -> select * from books order by author asc title desc
   *
   * @method
   * @public
   * @param {...String} order The order in which to return results.
   * @return {ChainedQuery} The newly configured query.
   */
  order: function() {
    var dup = this._dup();
    dup._order = dup._order.concat(dup._toOrder(arguments));
    return dup;
  },

  /**
   * Alias of {@link Order#order}.
   *
   * @method
   * @public
   * @see {@link Order#order}
   */
  orderBy: function() {
    return this.order.apply(this, arguments);
  }
});
