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

MySQLAdapter.Grammar = Adapter.Grammar.extend({
  quote: function(string) {
    return '`' + string + '`';
  }
});

module.exports = MySQLAdapter;
