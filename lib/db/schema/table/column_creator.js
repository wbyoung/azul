'use strict';

var Class = require('../../../util/class');
var ColumnAttributor = require('./column_attributor');

var col = function(type) {
  return function(name, options) {
    var opts = options || {};
    var column = {
      name: name,
      type: type,
      options: opts
    };
    this._columns.push(column);
    return ColumnAttributor.create(column);
  };
};

var ColumnCreator = Class.extend({
  init: function(columns) {
    this._super();
    this._columns = columns;
  },
  auto: col('serial'),
  increments: col('serial'),
  serial: col('serial'),
  integer: col('integer'),
  integer64: col('integer64'),
  string: col('string'),
  text: col('text'),
  binary: col('binary'),
  bool: col('bool'),
  date: col('date'),
  time: col('time'),
  dateTime: col('dateTime'),
  float: col('float'),
  decimal: col('decimal')
});

module.exports = ColumnCreator.reopenClass({
  __name__: 'Table~ColumnCreator'
});
