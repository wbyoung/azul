'use strict';

var Mixin = require('corazon/mixin');

/**
 * Limit & offset support for queries.
 *
 * @mixin Limit
 */
module.exports = Mixin.create(/** @lends Limit# */ {
  init: function() {
    this._super();
    this._limit = undefined;
    this._offset = undefined;
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
    this._limit = orig._limit;
    this._offset = orig._offset;
  },

  /**
   * Limits the number of items returned by the query.
   *
   * @method
   * @public
   * @param {Integer} limit The number of items to limit the query to.
   * @return {ChainedQuery} The newly configured query.
   * @see Condition
   */
  limit: function(limit) {
    var dup = this._dup();
    dup._limit = limit;
    return dup;
  },

  /**
   * Sets the offset for the query.
   *
   * @method
   * @public
   * @param {Integer} offset The offset for the query.
   * @return {ChainedQuery} The newly configured query.
   * @see Condition
   */
  offset: function(offset) {
    var dup = this._dup();
    dup._offset = offset;
    return dup;
  }
});
