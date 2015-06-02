'use strict';

var _ = require('lodash');
var Mixin = require('corazon/mixin');
var Statement = require('../types/statement');

/**
 * Phrasing mixin for update statement & related fragments.
 *
 * This mixin separates some of the logic of {@link Phrasing} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends Phrasing# */ {

  /**
   * Update statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {Object} data
   * @param {String} data.table
   * @param {Condition} data.where
   * @param {Array} data.values The values to set.
   * @see {Phrasing#where}
   * @see {Grammar#field}
   * @see {Grammar#value}
   * @return {Statement} The statement.
   */
  update: function(data) {
    var table = data.table;
    var values = data.values;
    var where = data.where;
    var quoteField = this._grammar.field.bind(this._grammar);
    var quoteMixed = this._grammar.mixed.bind(this._grammar);
    var join = this._grammar.join.bind(this._grammar);
    var delimit = this._grammar.delimit.bind(this._grammar);

    var createAssignment = function(value, field) {
      return join([quoteField(field), ' = ', quoteMixed(value)]);
    };
    var assignments = delimit(_.map(values, createAssignment));
    var fragments = [].concat(['UPDATE '], [quoteField(table)],
      [' SET '], assignments);

    if (where) { fragments.push(' ', this.where(where)); }

    return Statement.create(this._grammar.join(fragments));
  },

});
