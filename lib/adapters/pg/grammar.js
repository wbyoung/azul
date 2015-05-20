'use strict';

var Adapter = require('../base');
var Fragment = require('../../types/fragment');

/**
 * @protected
 * @constructor
 * @extends Adapter.Grammar
 */
var PGGrammar = Adapter.Grammar.extend(/** @lends PGAdapter.Grammar */ {
  value: function(value) {
    return Fragment.create('$1', [value]);
  },

  join: function(/*fragments*/) {
    var joined = this._super.apply(this, arguments);
    var position = 0;
    var sql = joined.sql.replace(/\$\d+/g, function() {
      return '$' + (position += 1);
    });
    return Fragment.create(sql, joined.args);
  }
});

module.exports = PGGrammar.reopenClass({ __name__: 'PGGrammar' });
