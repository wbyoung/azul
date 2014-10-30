'use strict';

var _ = require('lodash');
var BaseQuery = require('../../query/base');
var ColumnCreator = require('./columns');

/**
 * A query that allows creating tables.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link Schema#createTable}.
 *
 * @since 1.0
 * @protected
 * @constructor CreateTableQuery
 * @extends BaseQuery
 */
var CreateTableQuery = BaseQuery.extend(/** @lends CreateTableQuery# */{
  init: function() { throw new Error('CreateTableQuery must be spawned.'); },

  _create: function(name, cb) {
    if (!cb) { throw new Error('Missing callback to create columns.'); }
    this._super();
    this._name = name;
    this._columns = [];
    this._options = {
      ifNotExists: false
    };
    cb(ColumnCreator.create(this._columns));
  },

  /**
   * Duplication implementation.
   *
   * @see {@link BaseQuery#_take}
   */
  _take: function(orig) {
    this._super(orig);
    this._name = orig._name;
    this._columns = orig._columns;
    this._options = _.clone(orig._options);
  },

  /**
   * Generate SQL for a query.
   *
   * @see {@link BaseQuery#sql}
   */
  sql: function() {
    return this._adapter.phrasing.createTable({
      name: this._name,
      columns: this._columns,
      options: this._options
    });
  },

  /**
   * Documentation forthcoming.
   */
  unlessExists: function() {
    var dup = this._dup();
    dup._options.ifNotExists = true;
    return dup;
  }
});

module.exports = CreateTableQuery.reopenClass({
  __name__: 'CreateTableQuery'
});
