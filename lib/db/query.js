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
 * @since 1.0
 * @class Query
 * @protected
 * @constructor
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
 * @since 1.0
 * @protected
 * @method _dup
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
 *     select('people') // -> select * from people
 *     select('people', ['firstName', 'lastName']) // -> select firstName, lastName from people
 *
 * As it is most common to select data from a single table, this method only
 * supports a single table. To select from multiple tables, use `join`.
 *
 *     select('cities', ['cities.name', 'countries.name'])
 *       .join('countries', 'cities.country_id', 'countries.id')
 *     // -> select cities.name, countries.name from cities left join countries on cities.country_id = countries.id
 *
 * The preferred method for beginning a query chain is to use the convenience
 * methods provided by the DB.
 *
 * @since 1.0
 * @public
 * @chainable
 * @method select
 * @param {String} table The table from which to select data.
 * @param {Array} [columns] The columns to select, defaults to all (`*`).
 * @returns {Query} The newly configured query.
 * @see DB.prototype.select
 * @see DB.prototype.join
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
 * @since 1.0
 * @public
 * @chainable
 * @method where
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
 * @since 1.0
 * @public
 * @chainable
 * @method sql
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
    var columns = this._columns || '*';
    var where = this._where;
    sql = this._adapter.selectSQL(tables, columns, where);
  }
  else if (type === 'update') { sql = this._adapter.selectSQL(this._tables, this._columns); }
  else if (type === 'delete') { sql = this._adapter.selectSQL(this._tables, this._columns); }
  return sql;
};

module.exports = Query;
