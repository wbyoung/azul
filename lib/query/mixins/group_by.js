'use strict';

var Mixin = require('corazon/mixin');

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
   * Covert field to a field value suitable for use in the query. Mixins may
   * override this to alter the field.
   *
   * This will call super to ensure that it can be mixed into queries defining
   * their own `_toField`. The super value will be used before it attempts any
   * conversions.
   *
   * @method
   * @protected
   * @param {String} field Field to convert.
   * @return {String} The converted field.
   */
  _toField: function(field) {
    return this._super.apply(this, arguments) || field;
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
    dup._groupBy = this._toField(field);
    return dup;
  }
});
