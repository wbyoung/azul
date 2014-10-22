'use strict';

var _ = require('lodash');
var RawQuery = require('../../query/raw');

/**
 * A query that allows dropping tables.
 *
 * You will not create this query object directly. Instead, you will
 * receive it via {@link Schema#dropTable}.
 *
 * @since 1.0
 * @protected
 * @constructor DropTableQuery
 * @extends RawQuery
 */
var DropTableQuery = RawQuery.extend(/** @lends DropTableQuery# */{
  init: function(adapter, name) {
    this._super(adapter);
    this._name = name;
    this._options = {
      ifExists: false
    };
  },

  /**
   * Duplication implementation.
   *
   * @see {@link RawQuery#_dup}
   */
  _dup: function() {
    var dup = this._super();
    dup._name = this._name;
    dup._options = _.clone(this._options);
    return dup;
  },

  /**
   * Generate SQL for a query.
   *
   * @see {@link Query#sql}
   */
  sql: function() {
    return this._adapter.phrasing.dropTable({
      name: this._name,
      options: this._options
    });
  },

  /**
   * Documentation forthcoming.
   */
  ifExists: function() {
    var dup = this._dup();
    dup._options.ifExists = true;
    return dup;
  }
});

module.exports = DropTableQuery.reopenClass({
  __name__: 'DropTableQuery'
});