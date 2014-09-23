'use strict';

var Class = require('../util/class');
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
 * @protected
 * @constructor
 * @param {Adapter} adapter The adapter to use when using the query.
 */
var Query = Class.extend({
  init: function(adapter) {
    this._adapter = adapter;
    this._type = undefined;
    this._tables = [];
    this._joins = [];
    this._columns = undefined;
    this._where = undefined;
  }
});

/**
 * This method duplicates a query. Queries are immutable objects. All query
 * methods should return copies of the query rather than mutating any internal
 * state.
 *
 * @since 1.0
 * @protected
 * @method
 * @returns {Query} The duplicated query.
 */
Query.prototype._dup = function() {
  var dup = new Query();
  dup._adapter = this._adapter;
  dup._type = this._type;
  dup._tables = this._tables.slice(0);
  dup._joins = this._joins.slice(0);
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
 * supports a single table. To select from multiple tables, use
 * {@link Query#join}.
 *
 *     select('cities', ['cities.name', 'countries.name'])
 *       .join('countries', 'cities.country_id=countries.id')
 *     // -> select cities.name, countries.name from cities left join countries on cities.country_id = countries.id
 *
 * The preferred method for beginning a query chain is to use the convenience
 * methods provided by the DB.
 *
 * @since 1.0
 * @public
 * @chainable
 * @method
 * @param {String} table The table from which to select data.
 * @param {Array} [columns] The columns to select, defaults to all (`*`).
 * @returns {Query} The newly configured query.
 * @see Database#select
 * @see Query#join
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
 * Documentation forthcoming.
 *
 * @param {String} table The table on which to join.
 * @param {String} [type] The join type. This can be one of:
 *   - `'inner'` An inner join
 *   - `'left'` A left outer join
 *   - `'right'` A right outer join
 *   - `'full'` A full outer join
 *   - `'cross'` A cross join (the default)
 * @param {...(Condition|Object|String)} conditions The conditions on which to
 * join. If provided as an object or string, it will be converted to a proper
 * {@link Condition}.
 * @see {@link http://blog.codinghorror.com/a-visual-explanation-of-sql-joins/|A Visual Explanation of SQL Joins}
 * @return {Query} The newly configured query.
 */
Query.prototype.join = function(table, type, condition) {
  var dup = this._dup();
  var args = Array.prototype.slice.call(arguments);

  table = args.shift();

  var types = ['inner', 'left', 'right', 'full', 'cross'];
  var typeGiven = types.indexOf(args[0]) !== -1;
  type = typeGiven ? args.shift() : 'cross';

  condition = args.length > 0 ? w.apply(null, args) : null;

  dup._joins.push({
    table: table,
    type: type,
    condition: condition
  });

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
 * @method
 * @param {...(Condition|Object)} conditions The conditions by which to filter
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

// TODO: create a transform chain so that the model layer can simply
// add a transform to the results & either subclass to add functionality
// or simply use the query exactly as it stands.

/**
 * Generate SQL for a query.
 *
 * This uses the adapter to generate the appropriate SQL query.
 *
 * @since 1.0
 * @public
 * @chainable
 * @method
 * @returns {{sql: String, arguments:Array}} An object containing `sql`, the
 * SQL string for the query, and `arguments`, an array of arguments for the
 * query.
 */
Query.prototype.sql = function() {
  var sql;
  var type = this._type;
  if (type === 'insert') { sql = this._adapter.phrasing.select(this._tables, this._columns); }
  else if (type === 'select') {
    var tables = this._tables;
    var columns = this._columns || '*';
    var joins = this._joins;
    var where = this._where;
    sql = this._adapter.phrasing.select({
      tables: tables,
      columns: columns,
      joins: joins,
      where: where
    });
  }
  else if (type === 'update') { sql = this._adapter.phrasing.select(this._tables, this._columns); }
  else if (type === 'delete') { sql = this._adapter.phrasing.select(this._tables, this._columns); }
  return sql;
};

module.exports = Query;
