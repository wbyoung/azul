'use strict';

var Mixin = require('../../util/mixin');


/**
 * Model query mixin for `unique` support.
 *
 * This mixin relies on external functionality:
 *
 *   - It relies on properties & functionality from {@link ModelCore}.
 *
 * @mixin BoundUnique
 */
module.exports = Mixin.create(/** @lends BoundUnique# */ {

  /**
   * Return unique models by grouping by primary key.
   *
   * @return {ChainedQuery} The newly configured query.
   */
  unique: function() {
    if (!this._model) {
      throw new Error('Cannot perform `unique` on unbound query.');
    }
    return this.groupBy(this._model.__class__.prototype.pkAttr);
  },

});
