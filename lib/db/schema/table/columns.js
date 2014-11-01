'use strict';

var Class = require('../../../util/class');

var col = function(type) {
  return function(name) {
    this._columns.push({ name: name, type: type });
  };
}
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
