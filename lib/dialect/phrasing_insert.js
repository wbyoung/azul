'use strict';

var _ = require('lodash');
var Mixin = require('corazon/mixin');
var Statement = require('../types/statement');

/**
 * Phrasing mixin for insert statement & related fragments.
 *
 * This mixin separates some of the logic of {@link Phrasing} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends Phrasing# */ {

  /**
   * Insert statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {Object} data
   * @param {String} data.table
   * @param {String} data.returning
   * @param {Array} data.values The values to set. Column names should be
   * take calculated from the keys & the values property quoted.
   * @see {Grammar#field}
   * @see {Grammar#value}
   * @return {Statement} The statement.
   */
  insert: function(data) {
    var table = data.table;
    var returning = data.returning;
    var quoteField = this._grammar.field.bind(this._grammar);
    var quoteValue = this._grammar.value.bind(this._grammar);

    var columns = _(data.values)
      .map(_.keys)
      .flatten()
      .uniq()
      .value();

    var valueGroups = data.values.map(function(value) {
      var values = columns.map(function(col) {
        return value[col];
      }).map(quoteValue);
      values = this._grammar.delimit(values);
      values = this._grammar.join(values);
      values = this._grammar.group(values);
      values = this._grammar.join(values);
      return values;
    }, this);

    valueGroups = this._grammar.delimit(valueGroups);
    valueGroups = this._grammar.join(valueGroups);
    columns = this._grammar.delimit(columns.map(quoteField));
    columns = this._grammar.group(this._grammar.join(columns));
    var fragments = [].concat(['INSERT INTO '], [quoteField(table)],
      [' '], columns, [' VALUES '], valueGroups);

    if (returning) {
      fragments.push(' RETURNING ', quoteField(returning));
    }

    return Statement.create(this._grammar.join(fragments));
  },

});
