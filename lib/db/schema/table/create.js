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
 * @constructor
 * @extends RawQuery
 */
var CreateTableQuery = RawQuery.extend({
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
   * @see {@link-to RawQuery#_dup}
   */
  _dup: function() {
    var dup = this._super();
    dup._name = this._name;
    dup._columns = this._columns;
    dup._options = _.clone(this._options);
    return dup;
  },

  /**
   * Generate SQL for a query.
   *
   * @see {@link-to Query#sql}
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
