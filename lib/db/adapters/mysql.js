'use strict';

var Adapter = require('./base');

/**
 * MySQL Adapter
 *
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @constructor
 * @extends Adapter
 */
function MySQLAdapter() {
  Adapter.apply(this, arguments);
}

MySQLAdapter.prototype = Object.create(Adapter.prototype);
MySQLAdapter.prototype.constructor = MySQLAdapter;


MySQLAdapter.prototype.quoteField = function(name) {
  return '`' + name + '`';
};

module.exports = MySQLAdapter;
