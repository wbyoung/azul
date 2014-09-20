'use strict';

var util = require('util');
var Class = require('../../util/class');
var Fragment = require('./fragment');
var Statement = require('./statement');

/**
 * Documentation forthcoming.
 *
 * Just for building conditions.
 *
 * @since 1.0
 * @public
 * @constructor
 * @param {Grammar} grammar The grammar to use when building phrases.
 */
var Phrasing = Class.extend({
  init: function (grammar) {
    this._grammar = grammar;
  }
});


/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 * @return {Fragment} The where fragment.
 */
Phrasing.prototype.whereSQLFragment = function(condition) {
  return this._grammar.joinFragments([
    'where', ' ', condition.build(this._grammar)]);
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 * @return {Fragment} The join fragment.
 */
Phrasing.prototype.joinSQLFragment = function(join) {
  var fragments = [util.format('%s join %s', join.type, join.table)];
  if (join.condition) {
    fragments.push(' on ', join.condition.build(this._grammar));
  }
  return this._grammar.joinFragments(fragments);
};


/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 * @param {String|Array} data.columns The columns to select. This will be a string,
 * `*` when the request is for all columns. Otherwise, it will be an array of
 * strings representing the column names. The strings may be qualified with the
 * table name, in which case they would use a dot to separate the field from
 * the column. For example, `articles.title` would refer to the `title` column
 * of the `articles` table.
 */
Phrasing.prototype.select = function(data) {
  var tables = data.tables;
  var columns = data.columns;
  var joins = data.joins;
  var where = data.where;
  var quote = this._grammar.field.bind(this._grammar);
  var quotedColumns = columns === '*' ? [columns] : columns.map(quote);
  var fragments = [new Fragment(util.format('select %s from %s', quotedColumns.join(', '), tables.join(', ')))];

  if (where) { fragments.push(' ', this.whereSQLFragment(where)); }

  joins.forEach(function(join) {
    fragments.push(' ', this.joinSQLFragment(join));
  }, this);

  return new Statement(this._grammar.joinFragments(fragments));
};

module.exports = Phrasing;
