'use strict';

/**
 * Query
 *
 * TODO: Document
 */
function Query(adapter) {
  this._adapter = adapter;
  this._action = undefined;
  this._columns = [];
  this._tables = [];
}

Query.prototype._dup = function() {
  var dup = new Query();
  dup._adapter = this._adapter;
  dup._action = this._action;
  dup._columns = this._columns.slice(0);
  dup._tables = this._tables.slice(0);
  return dup;
};

/**
 * TODO: document
 */
Query.prototype.select = function(table) {
  if (this._action) { throw new Error('Cannot change `' + this._action + '` query to `select`.'); }
  var dup = this._dup();
  dup._action = 'select';
  dup._tables.push(table);
  return dup;
};

/**
 * TODO: document
 */
Query.prototype.sql = function() {
  var sql;
  var action = this._action;
  if (action === 'insert') { sql = this._adapter.selectSQL(this._tables, this._columns); }
  else if (action === 'select') {
    var tables = this._tables;
    var columns = this._columns.length > 0 ? this._columns : ['*'];
    sql = this._adapter.selectSQL(tables, columns);
  }
  else if (action === 'update') { sql = this._adapter.selectSQL(this._tables, this._columns); }
  else if (action === 'delete') { sql = this._adapter.selectSQL(this._tables, this._columns); }
  return sql;
};

module.exports = Query;
