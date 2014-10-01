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
var MySQLAdapter = Adapter.extend();

MySQLAdapter.reopenClass({
  Grammar: Adapter.Grammar.extend({
    quote: function(string) {
      return '`' + string + '`';
    }
  })
});

MySQLAdapter.reopenClass({ __name__: 'MySQLAdapter' });
module.exports = MySQLAdapter;
