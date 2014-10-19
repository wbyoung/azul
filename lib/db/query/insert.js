'use strict';

var _ = require('lodash');
var RawQuery = require('./raw');

var InsertQuery = RawQuery.extend(/** @lends InsertQuery# */{
  init: function(adapter, table, values) {
    this._super(adapter);
    this._table = table;
    this._values = _.isArray(values) ? values : [values];
  },

  _dup: function() {
    var dup = this._super();
    dup._table = this._table;
    dup._values = this._values && this._values.slice(0);
    return dup;
  },

  /**
   * Documentation forthcoming.
   */
  values: function(values) {
    // TODO: test multiple calls to values
    var dup = this._dup();
    dup._values = _.isArray(values) ? values : [values];
    return dup;
  },

  sql: function() {
    return this._adapter.phrasing.insert({
      // TODO: move to custom query subclass & only have one table
      table: this._table,
      values: this._values
    });
  }
});

module.exports = InsertQuery.reopenClass({ __name__: 'InsertQuery' });
