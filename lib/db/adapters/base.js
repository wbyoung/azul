'use strict';

var util = require('util');

/**
 * Postgres Adapter
 *
 * TODO: Document
 */
function Adapter() {

}

/**
 * TODO: Document
 */
Adapter.prototype.whereSQLFragment = function(condition) {
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
    return util.format('%s %s %j', key, predicates[predicate], value);
  };
  var op = function(type) { return type; };

  return condition.build(expression, op);
};


/**
 * TODO: Document
 */
Adapter.prototype.selectSQL = function(tables, columns, where) {
  var sql = util.format('select %s from %s', columns.join(', '), tables.join(', '));
  if (where) { sql += ' where ' + this.whereSQLFragment(where); }
  return sql;
};


module.exports = Adapter;
