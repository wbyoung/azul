'use strict';

var util = require('util');

/**
 * The base Adapter class is the extension point for custom database adapters.
 * As a user of Agave, you typically won't use this, but if you're looking to
 * add support for a custom database, you should start here.
 *
 * @since 1.0
 * @public
 * @class Adapter
 * @constructor
 */
function Adapter() {

}

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method whereSQLFragment
 */
Adapter.prototype.whereSQLFragment = function(condition) {
  var args = [];
  var expression = function(key, value, predicate) {
    var predicates = {
      'exact': '=',
      'iexact': 'LIKE',
      'contains': 'LIKE BINARY',
      'icontains': 'LIKE',
      'regex': 'REGEXP BINARY',
      'iregex': 'REGEXP',
      'gt': '>',
      'gte': '>=',
      'lt': '<',
      'lte': '<=',
      'startswith': 'LIKE BINARY',
      'endswith': 'LIKE BINARY',
      'istartswith': 'LIKE',
      'iendswith': 'LIKE',
    };
    args.push(value);
    return util.format('%s %s ?', key, predicates[predicate]);
  };
  var op = function(type) { return type; };

  return {
    sql: condition.build(expression, op),
    arguments: args
  };
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method quoteField
 */
Adapter.prototype.quoteField = function(name) {
  return '"' + name + '"';
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method selectSQL
 * @param {String|Array} columns The columns to select. This will be a string,
 * `*` when the request is for all columns. Otherwise, it will be an array of
 * strings representing the column names. The strings may be qualified with the
 * table name, in which case they would use a dot to separate the field from
 * the column. For example, `articles.title` would refer to the `title` column
 * of the `articles` table.
 */
Adapter.prototype.selectSQL = function(tables, columns, where) {
  var quote = this.quoteField.bind(this);
  var quotedColumns = columns === '*' ? [columns] : columns.map(quote);
  var result = {
    sql: util.format('select %s from %s', quotedColumns.join(', '), tables.join(', ')),
    arguments: []
  };
  if (where) {
    var fragment = this.whereSQLFragment(where);
    result.sql += ' where ' + fragment.sql;
    result.arguments = result.arguments.concat(fragment.arguments);
  }
  return result;
};


module.exports = Adapter;
