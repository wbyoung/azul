'use strict';

var util = require('util');

/**
 * Postgres Adapter
 *
 * TODO: Document
 */
function Adapter() {

}

/**
 * TODO: Document
 */
Adapter.prototype.selectSQL = function(tables, columns) {
  return util.format('select %s from %s', columns.join(', '), tables.join(', '));
};


module.exports = Adapter;
