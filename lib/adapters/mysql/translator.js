'use strict';

var _ = require('lodash');
var Adapter = require('../base');
var date = require('../../util/date');

/**
 * @protected
 * @constructor
 * @extends Adapter.Translator
 */
var MySQLTranslator = Adapter.Translator.extend(/** @lends MySQLAdapter.Translator */ {
  predicateForIExact: function(p) {
    return this._super(p).using('%s LIKE %s');
  },
  predicateForContains: function(p) {
    return this._super(p).using('%s LIKE BINARY %s')
      .value('like', 'contains');
  },
  predicateForIContains: function(p) {
    return this._super(p).using('%s LIKE %s').value('like', 'contains');
  },
  predicateForRegex: function(p) {
    return this._super(p).using('%s REGEXP BINARY %s').value('regex');
  },
  predicateForIRegex: function(p) {
    return this._super(p).using('%s REGEXP %s').value('regex');
  },
  predicateForStartsWith: function(p) {
    return this._super(p).using('%s LIKE BINARY %s')
      .value('like', 'startsWith');
  },
  predicateForIStartsWith: function(p) {
    return this._super(p).using('%s LIKE %s').value('like', 'startsWith');
  },
  predicateForEndsWith: function(p) {
    return this._super(p).using('%s LIKE BINARY %s')
      .value('like', 'endsWith');
  },
  predicateForIEndsWith: function(p) {
    return this._super(p).using('%s LIKE %s').value('like', 'endsWith');
  },
  predicateForWeekday: function(p) {
    var parseWeekday = date.parseWeekdayToInt;
    var shift = function(n) { return (n + 6) % 7; };
    return this._super(p).using('WEEKDAY(%s) = %s')
      .value(parseWeekday, shift);
  },

  typeForSerial: function() { return 'integer AUTO_INCREMENT'; },
  typeForBinary: function() { return 'longblob'; },

  /**
   * Boolean type for MySQL database backend.
   *
   * Booleans in MySQL are actually stored as numbers. A value of 0 is
   * considered false. Nonzero values are considered true.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForBool: function() { return this._super.apply(this, arguments); },

  /**
   * Decimal type for MySQL database backend.
   *
   * The decimal type for MySQL applies default values of `precision: 64` and
   * `scale: 30` if no precision is given.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForDecimal: function(options) {
    var opts = _.clone(options || {});
    if (!opts.precision) {
      opts.precision = 64;
      opts.scale = 30;
    }
    return this._super(opts);
  }

});

module.exports = MySQLTranslator.reopenClass({ __name__: 'MySQLTranslator' });
