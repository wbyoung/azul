'use strict';

var Class = require('../../../util/class');

// TODO: handle more types & options
var ColumnCreator = Class.extend({
  init: function(columns) {
    this._super();
    this._columns = columns;
  },
  string: function(name) {
    this._columns.push({ name: name, type: 'string' });
  },
  text: function(name) {
    this._columns.push({ name: name, type: 'text' });
  },
  serial: function(name) {
    this._columns.push({ name: name, type: 'serial' });
  }
});

module.exports = ColumnCreator.reopenClass({
  __name__: 'Table~ColumnCreator'
});
