'use strict';

var RawQuery = require('./raw');
var Condition = require('../condition');

var DeleteQuery = RawQuery.extend(/** @lends DeleteQuery# */{
  init: function(adapter, table) {
    this._super(adapter);
    this._table = table;
  },

  _dup: function() {
    var dup = this._super();
    dup._table = this._table;
    dup._where = this._where && Condition.create(this._where);  // TODO: mixins: move to mixin
    return dup;
  },

  sql: function() {
    return this._adapter.phrasing.delete({
      table: this._table,
      where: this._where
    });
  }

});

DeleteQuery.reopen(require('./mixins/where'));

module.exports = DeleteQuery.reopenClass({ __name__: 'DeleteQuery' });
