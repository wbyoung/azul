'use strict';

var _ = require('lodash');
var RawQuery = require('../../query/raw');
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
 * @extends RawQuery
 */
var CreateTableQuery = RawQuery.extend(/** @lends CreateTableQuery# */{
  init: function(adapter, name, cb) {
    this._super(adapter);
    this._name = name;
    this._columns = [];
    this._options = {
      ifNotExists: false
    };
    if (cb) {
      cb(ColumnCreator.create(this._columns));
    }
  },

  /**
   * Duplication implementation.
   *
   * @see {@link RawQuery#_take}
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
   * @see {@link RawQuery#sql}
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
