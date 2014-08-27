'use strict';

var Condition = require('./condition'), w = Condition;

/**
 * Queries are the building block of Agave's database abstraction layer. They
 * are immutable, chainable objects. Each operation that you perform on a query
 * will return a duplicated query rather than the original. The duplicated
 * query will be configured as requested.
 *
 * Generally, you will not create queries directly. Instead, you will receive
 * a query object via one of many convenience methods.
 *
 * @class Query
 * @constructor
 * @protected
 * @param {Adapter} adapter The adapter to use when using the query.
 */
function Query(adapter) {
  this._adapter = adapter;
  this._type = undefined;
  this._tables = [];
  this._columns = undefined;
  this._where = undefined;
}

/**
 * This method duplicates a query. Queries are immutable objects. All query
 * methods should return copies of the query rather than mutating any internal
 * state.
 *
 * @method _dup
 * @protected
 * @returns {Query} The duplicated query.
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
 * Begin a query chain and specify that this is a select query. Like all other
 * methods that begin a query chain, this method is intended to be called only
 * once and is mutually exclusive with those methods.
 *
 * The preferred method for beginning a query chain is to use the convenience
 * methods provided by the DB.
 *
 * @method select
 * @public
 * @param {String} table The table from which to select data.
 * @param {Array} [columns] The columns to select, defaults to all (`*`).
 * @returns {Query} The newly configured query.
 * @see DB.prototype.select
 */
Query.prototype.select = function(table, columns) {
  if (this._type) { throw new Error('Cannot change `' + this._type + '` query to `select`.'); }
  var dup = this._dup();
  dup._type = 'select';
  dup._tables.push(table);
  if (columns) {
    dup._columns = (dup._columns || []).concat(columns);
  }
  return dup;
};


/**
 * Filter results based on conditions. This method relies heavily on the use of
 * conditions. Using `Condition`, you can build complex queries. For simple
 * queries, simply pass in an object.
 *
 *     select('users').where({ id: 1 })
 *     select('users').where([{ first: 'Whitney' }, w.or, { first: 'Whit' }], w.and, { last: 'Young' })
 *     select('users').where({ 'age[gt]': 30 })
 *
 * @method where
 * @public
 * @param {...Condition|Object} conditions The conditions by which to filter
 * the query.
 * @returns {Query} The newly configured query.
 * @see Condition
 */
Query.prototype.where = function() {
  var dup = this._dup();

  var args = Array.prototype.slice.call(arguments);
  var conditions = dup._where ? [dup._where].concat(args) : args;
  dup._where = w.apply(null, conditions);

  return dup;
};


/**
 * Generate SQL for a query.
 *
 * This uses the adapter to generate the appropriate SQL query.
 *
 * @method sql
 * @public
 * @returns {Object} An object containing the following:
 *   - `sql` The SQL for the query <small>(type `String`)</small>
 *   - `arguments` The SQL for the query <small>(type `Array`)</small>
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
