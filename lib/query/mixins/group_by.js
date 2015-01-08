'use strict';

var Mixin = require('../../util/mixin');

/**
 * Group by support for queries.
 *
 * @mixin GroupBy
 */
module.exports = Mixin.create(/** @lends GroupBy# */ {
  init: function() {
    this._super();
    this._groupBy = undefined;
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
    this._groupBy = orig._groupBy;
  },

  /**
   * Groups the results of a query by a specific field.
   *
   * @method
   * @public
   * @param {String} field The field to group by.
   * @return {ChainedQuery} The newly configured query.
   */
  groupBy: function(field) {
    var dup = this._dup();
    dup._groupBy = field;
    return dup;
  }
});
