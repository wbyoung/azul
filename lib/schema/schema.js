'use strict';

var BaseQuery = require('../query/base');
var CreateTableQuery = require('./table/create');
var AlterTableQuery = require('./table/alter');
var DropTableQuery = require('./table/drop');
var Transaction = require('../query/mixins/transaction');


/**
 * Begin a schema query chain. Like all other methods that begin a query chain,
 * this method is intended to be called only once and is mutually exclusive
 * with those methods.
 *
 *     schema().dropTable('people') // -> drop table people
 *
 * @method EntryQuery#schema
 * @public
 * @return {SchemaQuery} The newly configured query.
 */

/**
 * A schema is the building block of Azul's schema migration layer. It exposes
 * methods that spawn new query objects.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link EntryQuery#schema}.
 *
 * @protected
 * @constructor
 * @extends BaseQuery
 * @mixes Transaction
 */
var Schema = BaseQuery.extend(Transaction, /** @lends Schema# */ {
  init: function() { throw new Error('Schema must be spawned.'); },

  /**
   * @function Schema~CreateTableCallback
   * @param {ColumnCreator} table The table object on which you can create
   * columns.
   */

  /**
   * Create a table.
   *
   * @method
   * @public
   * @param {String} name The name of the table to create.
   * @param {Schema~CreateTableCallback} cb A callback that will allow you to
   * create table columns.
   * @return {CreateTableQuery} A query to execute to create the table.
   */
  createTable: function() { return this._spawn(CreateTableQuery, arguments); },

  /**
   * @function Schema~AlterTableCallback
   * @param {TableAlterer} table The table object on which you can alter a
   * table, for instance creating and dropping columns.
   */

  /**
   * Alter a table.
   *
   * @method
   * @public
   * @param {String} name The name of the table to alter.
   * @param {Schema~AlterTableCallback} cb A callback that will allow you to
   * create and drop table columns.
   * @return {CreateTableQuery} A query to execute to alter the table.
   */
  alterTable: function() { return this._spawn(AlterTableQuery, arguments); },

  /**
   * Drop a table.
   *
   * @method
   * @public
   * @param {String} name The name of the table to drop.
   * @return {DropTableQuery} A query to execute to drop the table.
   */
  dropTable: function() { return this._spawn(DropTableQuery, arguments); },

  /**
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    throw new Error('Must first call one of the schema methods.');
  }
});

module.exports = Schema.reopenClass({ __name__: 'Schema' });
