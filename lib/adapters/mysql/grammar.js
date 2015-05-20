'use strict';

var _ = require('lodash');
var Adapter = require('../base');
var mysql = require('mysql');

/**
 * @protected
 * @constructor
 * @extends Adapter.Grammar
 */
var MySQLGrammar = Adapter.Grammar.extend(/** @lends MySQLAdapter.grammar */ {
  quote: function(string) {
    return mysql.escapeId(string);
  },
  escape: function(value) {
    value = _.isString(value) ? value.replace('\\', '\\\\') : value;
    return this._super(value);
  }
});

module.exports = MySQLGrammar.reopenClass({ __name__: 'MySQLGrammar' });
