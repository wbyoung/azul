'use strict';

var Condition = require('./condition'), w = Condition;

/**
 * Query
 *
 * TODO: Document
 */
function Query(adapter) {
  this._adapter = adapter;
  this._action = undefined;
  this._tables = [];
  this._columns = undefined;
  this._where = undefined;
}

/**
 * TODO: document
 */
Query.prototype._dup = function() {
  var dup = new Query();
  dup._adapter = this._adapter;
  dup._action = this._action;
  dup._tables = this._tables.slice(0);
  dup._columns = this._columns && this._columns.slice(0);
  dup._where = this._where && new Condition(this._where);
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
Query.prototype.where = function() {
  var dup = this._dup();

  var args = Array.prototype.slice.call(arguments);
  var conditions = dup._where ? [dup._where].concat(args) : args;
  dup._where = w.apply(null, conditions);

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
    var columns = this._columns || ['*'];
    var where = this._where;
    sql = this._adapter.selectSQL(tables, columns, where);
  }
  else if (action === 'update') { sql = this._adapter.selectSQL(this._tables, this._columns); }
  else if (action === 'delete') { sql = this._adapter.selectSQL(this._tables, this._columns); }
  return sql;
};

module.exports = Query;
