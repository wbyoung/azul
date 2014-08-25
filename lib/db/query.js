'use strict';

/**
 * Query
 *
 * TODO: Document
 */
function Query(adapter) {
  this._adapter = adapter;
  this._action = undefined;
  this._columns = undefined;
  this._tables = [];
}

Query.prototype._setAction = function(action) {
  if (this._action) { throw new Error('Cannot change action on query'); }
  this._action = action;
};

/**
 * TODO: document
 */
Query.prototype.select = function(table) {
  this._action = 'select';
  this._tables.push(table);
  return this;
};

/**
 * TODO: document
 */
Query.prototype.sql = function() {
  var sql;
  var action = this._action;
  if (action === 'insert') { sql = this._adapter.selectSQL(this._tables, this._columns); }
  else if (action === 'select') { sql = this._adapter.selectSQL(this._tables, this._columns || ['*']); }
  else if (action === 'update') { sql = this._adapter.selectSQL(this._tables, this._columns); }
  else if (action === 'delete') { sql = this._adapter.selectSQL(this._tables, this._columns); }
  return sql;
};

module.exports = Query;
