'use strict';

var Condition = require('./condition'), w = Condition;

/**
 * Query
 *
 * TODO: Document
 */
function Query(adapter) {
  this._adapter = adapter;
  this._type = undefined;
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
  dup._type = this._type;
  dup._tables = this._tables.slice(0);
  dup._columns = this._columns && this._columns.slice(0);
  dup._where = this._where && new Condition(this._where);
  return dup;
};

/**
 * TODO: document
 */
Query.prototype.select = function(table) {
  if (this._type) { throw new Error('Cannot change `' + this._type + '` query to `select`.'); }
  var dup = this._dup();
  dup._type = 'select';
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
  var type = this._type;
  if (type === 'insert') { sql = this._adapter.selectSQL(this._tables, this._columns); }
  else if (type === 'select') {
    var tables = this._tables;
    var columns = this._columns || ['*'];
    var where = this._where;
    sql = this._adapter.selectSQL(tables, columns, where);
  }
  else if (type === 'update') { sql = this._adapter.selectSQL(this._tables, this._columns); }
  else if (type === 'delete') { sql = this._adapter.selectSQL(this._tables, this._columns); }
  return sql;
};

module.exports = Query;
