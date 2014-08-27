'use strict';

var util = require('util');

/**
 * Postgres Adapter
 *
 * Documentation forthcoming.
 */
function Adapter() {

}

/**
 * Documentation forthcoming.
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
 */
Adapter.prototype.quoteField = function(name) {
  return name;
};

/**
 * Documentation forthcoming.
 */
Adapter.prototype.selectSQL = function(tables, columns, where) {
  var quote = this.quoteField.bind(this);
  var result = {
    sql: util.format('select %s from %s', columns.map(quote).join(', '), tables.join(', ')),
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
