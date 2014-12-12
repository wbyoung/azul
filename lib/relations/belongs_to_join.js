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
  join: function(query) {
    var table = this._relatedModel.tableName;
    var fk = [this._modelClass.tableName, this.foreignKey].join('.');
    var pk = [table, this.primaryKey].join('.');
    var condition = [fk, pk].join('=');
    return query.join(table, 'inner', condition);
  }

});
