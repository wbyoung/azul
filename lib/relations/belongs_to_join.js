'use strict';

var Mixin = require('../util/mixin');

/**
 * BelongsTo mixin for joining.
 *
 * This mixin separates some of the logic of {@link BelongsTo} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends BelongsTo# */ {

  /**
   * Override of {@link BaseRelation#join}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#join}
   */
  join: function(/*query*/) {
    // TODO: remove this after testing has many joins and determining if the
    // two types need to be handled differently.
    throw new Error('This is no longer used.');
  }

});
