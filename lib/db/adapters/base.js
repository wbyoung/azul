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
  var fragment = '';
  condition.each(function(key, value, operator) {
    fragment += util.format('%s %s %s', key, operator, value);
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
