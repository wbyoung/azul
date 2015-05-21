'use strict';

var _ = require('lodash');
var BaseQuery = require('../../query/base');
var Transaction = require('../../query/mixins/transaction');
var Procedure = require('../../query/mixins/procedure');
var TableCreator = require('./table_creator');
var Statement = require('../../types/statement');

/**
 * A query that allows creating tables.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link Schema#createTable}.
 *
 * @protected
 * @constructor CreateTable
 * @extends BaseQuery
 * @mixes Transaction
 */
var CreateTable = BaseQuery.extend();

CreateTable.reopen(Transaction);
CreateTable.reopen(Procedure);

CreateTable.reopen(/** @lends CreateTable# */ {
  init: function() { throw new Error('CreateTable must be spawned.'); },

  /**
   * Override of {@link BaseQuery#_create}.
   *
   * @method
   * @private
   * @see {@link BaseQuery#_create}
   * @see {@link Schema#createTable} for parameter details.
   */
  _create: function(name, cb) {
    this._super();
    this._name = name;
    this._cb = cb;
    this._pk = 'id';
    this._options = {
      ifNotExists: false
    };
  },

  /**
   * Duplication implementation.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._name = orig._name;
    this._cb = orig._cb;
    this._pk = orig._pk;
    this._explicitPk = orig._explicitPk;
    this._options = _.clone(orig._options);
  },

  /**
   * Get the procedure for altering the table.
   *
   * @method
   * @private
   * @return {?Procedure}
   */
  _procedure: function() {
    this._configure();
    return this._adapter.procedures.createTable(this._data());
  },

  /**
   * Override of {@link BaseQuery#statement}.
   *
   * @method
   * @protected
   * @see {@link BaseQuery#statement}
   */
  _statement: function() {
    this._configure();

    var statement = this._adapter.phrasing.createTable(this._data());
    if (this._procedure()) {
      statement = Statement.create('-- procedure for ' +
        statement.value, statement.args);
    }
    return statement;
  },

  /**
   * Get the data for statement/procedure generation.
   *
   * @method
   * @private
   * @return {Object}
   */
  _data: function() {
    return {
      name: this._name,
      columns: this._creator.columns,
      indexes: this._creator.indexes,
      options: this._options
    };
  },

  /**
   * Configure aspects of the query that require delayed calculation.
   *
   * @method
   * @private
   */
  _configure: function() {
    if (this._creator) { return; } // only configure once

    if (!this._cb) { throw new Error('Missing callback to create columns.'); }

    this._creator = TableCreator.create(this._name);
    this._cb(this._creator);
    this._configurePk();

    if (this._pkCount() > 1) {
      throw new Error('Table may only have one primary key column.');
    }
  },

  /**
   * Configure the primary key column (or create one).
   *
   * @method
   * @private
   * @return {Column}
   */
  _configurePk: function() {
    var pkColumn = this._pkColumn();
    if (!pkColumn && this._pkRequired()) {
      pkColumn = this._creator.serial(this._pk, {}, 0);
    }
    if (pkColumn) {
      pkColumn.primaryKey();
    }
    return pkColumn;
  },

  /**
   * Check if a primary key column is required on this table.
   *
   * The primary key column is required with an explicit primary key definition
   * ({@link CreateTable#primaryKey} was called) is made and the user set
   * the primary key to a non-null value.
   *
   * The primary key column is also required implicitly when that method was
   * not called and there were never any primary key columns added.
   *
   * @method
   * @private
   * @return {Boolean}
   */
  _pkRequired: function() {
    var explicit = this._explicitPk;
    var implicit = !explicit;
    return (explicit && this._pk) || // explicit pk with a value
      (implicit && this._pkCount() === 0); // implicitly `id` since no pk
  },

  /**
   * Find the primary key column in the set of existing columns.
   *
   * @method
   * @private
   * @return {?Column}
   */
  _pkColumn: function() {
    var filter = function(col) { return col.name === this._pk; }.bind(this);
    return _(this._creator.columns).filter(filter).get(0);
  },

  /**
   * Calculate the number of primary key columns.
   *
   * @method
   * @private
   * @return {Number}
   */
  _pkCount: function() {
    return _(this._creator.columns).map('options')
      .filter('primaryKey').size();
  },

  /**
   * Specify that this table should be created only if one with the same name
   * does not already exist.
   *
   * @method
   * @public
   * @return {ChainedQuery} The newly configured query.
   */
  unlessExists: function() {
    var dup = this._dup();
    dup._options.ifNotExists = true;
    return dup;
  },

  /**
   * Specify the name (or absence) of a primary key for this table.
   *
   * @method
   * @public
   * @return {ChainedQuery} The newly configured query.
   */
  primaryKey: function(pk) {
    var dup = this._dup();
    dup._pk = pk;
    dup._explicitPk = true;
    return dup;
  },

  /**
   * Alias of {@link CreateTable#primaryKey}.
   *
   * @method
   * @public
   * @see {@link CreateTable#primaryKey}
   */
  pk: function() {
    return this.primaryKey.apply(this, arguments);
  },

  /**
   * Specify the table creation callback.
   *
   * @method
   * @public
   * @param {Schema~CreateTableCallback} [cb] A callback that will allow you to
   * define the table.
   * @return {ChainedQuery} The newly configured query.
   */
  with: function(cb) {
    var dup = this._dup();
    dup._cb = cb;
    return dup;
  },

});

module.exports = CreateTable.reopenClass({
  __name__: 'CreateTable'
});
