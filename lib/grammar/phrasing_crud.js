'use strict';

var _ = require('lodash');
var Mixin = require('../util/mixin');
var Statement = require('./statement');

/**
 * Phrasing mixin for CRUD related phrases.
 *
 * This mixin separates some of the logic of {@link Phrasing} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends Phrasing# */ {

  /**
   * Select statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {Object} data
   * @param {Array.<String>} data.tables
   * @param {Condition} data.where
   * @param {Array.<Object>} data.joins
   * @param {Integer} data.limit
   * @param {Object} data.order
   * @param {Array.<String>} data.columns The columns to select.
   * @see {Phrasing#where}
   * @see {Phrasing#join}
   * @see {Phrasing#limit}
   * @see {Phrasing#order}
   * @see {Grammar#field}
   * @return {Statement} The statement.
   */
  select: function(data) {
    var tables = data.tables;
    var columns = data.columns;
    var joins = data.joins;
    var where = data.where;
    var limit = data.limit;
    var offset = data.offset;
    var order = data.order;
    var groupBy = data.groupBy;
    var quote = this._grammar.field.bind(this._grammar);
    var quotedColumns = columns.map(quote);
    var delimitedColumns = this._grammar.delimit(quotedColumns);
    var delimitedTables = this._grammar.delimit(tables.map(quote));
    var fragments = [].concat(['SELECT '],
      delimitedColumns, [' FROM '], delimitedTables);

    joins.forEach(function(join) {
      fragments.push(' ', this.join(join));
    }, this);

    if (where) { fragments.push(' ', this.where(where)); }
    if (groupBy) { fragments.push(' ', this.groupBy(groupBy)); }
    if (order.length) { fragments.push(' ', this.order(order)); }
    if (limit !== undefined) {
      fragments.push(' ', this.limit(limit, offset));
    }

    return Statement.create(this._grammar.join(fragments));
  },

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
  }

});
