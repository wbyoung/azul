'use strict';

var _ = require('lodash');
var RawQuery = require('../../query/raw');
var ColumnCreator = require('./columns');

var CreateTableQuery = RawQuery.extend({
  init: function(adapter, name, cb) {
    this._name = name;
    this._columns = [];
    this._options = {
      ifNotExists: false
    };
    if (cb) {
      cb(ColumnCreator.create(this._columns));
    }
  },

  _dup: function() {
    var dup = this._super();
    dup._name = this._name;
    dup._columns = this._columns;
    dup._options = _.clone(this._options);
    return dup;
  },

  sql: function() {
    return this._adapter.phrasing.createTable({
      name: this._name,
      columns: this._columns,
      options: this._options
    });
  },

  unlessExists: function() {
    var dup = this._dup();
    dup._options.ifNotExists = true;
    return dup;
  }
});

module.exports = CreateTableQuery.reopenClass({
  __name__: 'CreateTableQuery'
});
