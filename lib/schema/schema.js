'use strict';

var _ = require('lodash');
var BaseQuery = require('../query/base');
var CreateTableQuery = require('./table/create');
var AlterTableQuery = require('./table/alter');
var DropTableQuery = require('./table/drop');

/**
 * A schema is the building block of Azul's schema migration layer. It exposes
 * methods that returns {@link BaseQuery} objects.
 *
 * Generally, you will not create a schema object directly. Instead, you will
 * receive a schema object via the {@link Database}.
 *
 * @protected
 * @constructor
 * @param {Adapter} adapter The adapter to use when using the query.
 */
var Schema = BaseQuery.extend(/** @lends Schema# */ {

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
   * Override of {@link BaseQuery#sql}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#sql}
   */
  sql: function() {
    var result, underlyingError;
    try { result = this._super(); }
    catch (e) { underlyingError = e; }
    if (!result) {
      var msg = 'Must first call one of the schema methods.';
      throw _.extend(new Error(msg), {
        underlyingError: underlyingError
      });
    }
    return result;
  }
});

module.exports = Schema.reopenClass({ __name__: 'Schema' });
