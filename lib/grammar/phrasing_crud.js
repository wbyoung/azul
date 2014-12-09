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
   * Documentation forthcoming.
   *
   * @method
   * @public
   * @param {String|Array} data.columns The columns to select. This will be a string,
   * `*` when the request is for all columns. Otherwise, it will be an array of
   * strings representing the column names. The strings may be qualified with the
   * table name, in which case they would use a dot to separate the field from
   * the column. For example, `articles.title` would refer to the `title` column
   * of the `articles` table.
   * @return {Statement} The select statement.
   */
  select: function(data) {
    var tables = data.tables;
    var all = data.all;
    var columns = data.columns;
    var joins = data.joins;
    var where = data.where;
    var limit = data.limit;
    var order = data.order;
    var quote = this._grammar.field.bind(this._grammar);
    var quotedColumns = all ? ['*'] : columns.map(quote);
    var delimitedColumns = this._grammar.delimit(quotedColumns);
    var delimitedTables = this._grammar.delimit(tables.map(quote));
    var fragments = [].concat(['SELECT '],
      delimitedColumns, [' FROM '], delimitedTables);

    joins.forEach(function(join) {
      fragments.push(' ', this.join(join));
    }, this);

    if (where) { fragments.push(' ', this.where(where)); }
    if (order.length) { fragments.push(' ', this.order(order)); }
    if (limit !== undefined) { fragments.push(' ', this.limit(limit)); }

    return Statement.create(this._grammar.join(fragments));
  },

  /**
   * Documentation forthcoming.
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
   * Documentation forthcoming.
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
   * Documentation forthcoming.
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
