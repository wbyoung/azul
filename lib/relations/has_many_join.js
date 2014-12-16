'use strict';

var Mixin = require('../util/mixin');

/**
 * HasMany mixin for joining.
 *
 * This mixin separates some of the logic of {@link HasMany} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends HasMany# */ {

  /**
   * Override of {@link BaseRelation#joinCondition}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#joinCondition}
   */
  joinCondition: function(baseTable, joinTable) {
    var pk = [baseTable, this.primaryKey].join('.');
    var fk = [joinTable, this.foreignKey].join('.');
    return [fk, pk].join('=');
  }

});
