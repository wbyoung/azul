'use strict';

var util = require('util');

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
function Phrasing(grammar) {
  this._grammar = grammar;
};



/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Phrasing.prototype.conditionSQLFragment = function(condition) {
  var result = condition.build(this._grammar);

  return {
    sql: result.toString(),
    arguments: result.arguments
  };
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Phrasing.prototype.whereSQLFragment = function(condition) {
  var result = this.conditionSQLFragment(condition);
  result.sql = 'where ' + result.sql;
  return result;
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Phrasing.prototype.joinSQLFragment = function(join) {
  var type = join.type;
  var table = join.table;

  var result = {};
  result.sql = type + ' join ' + table;
  result.arguments = [];

  if (join.condition) {
    var condition = this.conditionSQLFragment(join.condition);
    result.sql += ' on ' + condition.sql;
    result.arguments = result.arguments.concat(condition.arguments);
  }

  return result;
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
  var result = {
    sql: util.format('select %s from %s', quotedColumns.join(', '), tables.join(', ')),
    arguments: []
  };
  if (where) {
    var fragment = this.whereSQLFragment(where);
    result.sql += ' ' + fragment.sql;
    result.arguments = result.arguments.concat(fragment.arguments);
  }
  joins.forEach(function(join) {
    var fragment = this.joinSQLFragment(join);
    result.sql += ' ' + fragment.sql;
    result.arguments = result.arguments.concat(fragment.arguments);
  }, this);
  return result;
};

module.exports = Phrasing;
