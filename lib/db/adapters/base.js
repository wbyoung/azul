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
Adapter.prototype.whereSQLFragment = function(where) {
  var fragment = '';
  where.forEach(function(condition) {
    Object.keys(condition).forEach(function(key) {
      var value = condition[key];
      var operator = '='; // TODO: remove assumption
      fragment += util.format('%s %s %s', key, operator, value);
    });
  });
  return fragment;
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
