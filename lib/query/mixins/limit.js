'use strict';

var Mixin = require('../../util/mixin');
var Condition = require('../../condition'), w = Condition.w;

/**
 * Limit & offset support for queries.
 *
 * @mixin Limit
 */
module.exports = Mixin.create(/** @lends Limit# */ {
  init: function() {
    this._super();
    this._limit = undefined;
  },

  /**
   * Duplication implementation.
   *
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._limit = orig._limit;
  },

  /**
   * Limits the number of items returned by the query.
   *
   * @public
   * @method
   * @param {Integer} limit The number of items to limit the query to.
   * @return {ChainedQuery} The newly configured query.
   * @see Condition
   */
  limit: function(limit) {
    var dup = this._dup();
    dup._limit = limit;
    return dup;
  }
});
