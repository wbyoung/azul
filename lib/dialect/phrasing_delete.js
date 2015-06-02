'use strict';

var Mixin = require('corazon/mixin');
var Statement = require('../types/statement');

/**
 * Phrasing mixin for delete statement & related fragments.
 *
 * This mixin separates some of the logic of {@link Phrasing} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends Phrasing# */ {

  /**
   * Delete statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {Object} data
   * @param {String} data.table
   * @param {Condition} data.where
   * @see {Phrasing#where}
   * @return {Statement} The statement.
   */
  delete: function(data) {
    var table = data.table;
    var where = data.where;
    var quote = this._grammar.field.bind(this._grammar);
    var fragments = [].concat(['DELETE FROM '],
      quote(table));

    if (where) { fragments.push(' ', this.where(where)); }

    return Statement.create(this._grammar.join(fragments));
  },

});
