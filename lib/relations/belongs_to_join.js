'use strict';

var Mixin = require('../util/mixin');
var property = require('../util/property').fn;

/**
 * BelongsTo mixin for joining.
 *
 * This mixin separates some of the logic of {@link BelongsTo} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends BelongsTo# */ {

  /**
   * Override of {@link BaseRelation#joinKey}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#joinKey}
   */
  joinKey: property(function() {
    return this.foreignKey;
  }),

  /**
   * Override of {@link BaseRelation#inverseKey}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#inverseKey}
   */
  inverseKey: property(function() {
    return this.primaryKey;
  }),

  /**
   * Override of {@link BaseRelation#joinCondition}.
   *
   * @method
   * @protected
   * @see {@link BaseRelation#joinCondition}
   */
  joinCondition: function(baseTable, joinTable) {
    var fk = [baseTable, this.foreignKey].join('.');
    var pk = [joinTable, this.primaryKey].join('.');
    return [fk, pk].join('=');
  }

});
