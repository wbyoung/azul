'use strict';

var BaseQuery = require('../query/base');
var CreateTable = require('./table/create');
var AlterTable = require('./table/alter');
var RenameTableQuery = require('./table/rename');
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
   * Create a reversible schema query.
   *
   * @method
   * @public
   * @return {ReversibleSchema} A schema to use like this one, but ensures only
   * reversible actions will be taken.
   */
  reversible: function() {
    return this._spawn(require('./reversible'), arguments);
  },

  /**
   * Create a reversible schema query.
   *
   * @method
   * @public
   * @return {ReverseSchema} A schema to use like this one, but reverses all
   * actions.
   */
  reverse: function() {
    return this._spawn(require('./reverse'), arguments);
  },

  /**
   * @function Schema~CreateTableCallback
   * @param {TableCreator} table The table object on which you can create
   * columns.
   */

  /**
   * Create a table.
   *
   * @method
   * @public
   * @param {String} name The name of the table to create.
   * @param {Schema~CreateTableCallback} [cb] A callback that will allow you to
   * create table columns.
   * @return {CreateTable} A query to execute to create the table.
   */
  createTable: function() { return this._spawn(CreateTable, arguments); },

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
   * @return {CreateTable} A query to execute to alter the table.
   */
  alterTable: function() { return this._spawn(AlterTable, arguments); },

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
   * Rename a table.
   *
   * @method
   * @public
   * @param {String} from The name of the table to rename.
   * @param {String} to The new name for the table.
   * @return {DropTableQuery} A query to execute to drop the table.
   */
  renameTable: function() { return this._spawn(RenameTableQuery, arguments); },

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
