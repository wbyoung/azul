'use strict';

var Adapter = require('../base');

var LIKE_FORMAT = '%s LIKE %s ESCAPE \'\\\'';
var ILIKE_FORMAT = 'UPPER(%s) LIKE UPPER(%s) ESCAPE \'\\\'';

/**
* @protected
* @constructor
* @extends Adapter.Translator
*/
var SQLite3Translator = Adapter.Translator.extend(/** @lends SQLite3Adapter.Translator */ {
  predicateForIExact: function(p) {
    return this._super(p).using(ILIKE_FORMAT);
  },
  predicateForContains: function(p) {
    return this._super(p).using(LIKE_FORMAT).value('like', 'contains');
  },
  predicateForIContains: function(p) {
    return this._super(p).using(ILIKE_FORMAT).value('like', 'contains');
  },
  predicateForRegex: function(p) {
    // without the escaping & concatenation this reads `%s REGEXP /%s/`
    return this._super(p)
      .using('%s REGEXP \'/\' || %s || \'/\'').value('regex');
  },
  predicateForIRegex: function(p) {
    // without the escaping & concatenation this reads `%s REGEXP /%s/i`
    return this._super(p)
      .using('%s REGEXP \'/\' || %s || \'/i\'').value('regex');
  },
  predicateForStartsWith: function(p) {
    return this._super(p).using(LIKE_FORMAT).value('like', 'startsWith');
  },
  predicateForIStartsWith: function(p) {
    return this._super(p).using(ILIKE_FORMAT).value('like', 'startsWith');
  },
  predicateForEndsWith: function(p) {
    return this._super(p).using(LIKE_FORMAT).value('like', 'endsWith');
  },
  predicateForIEndsWith: function(p) {
    return this._super(p).using(ILIKE_FORMAT).value('like', 'endsWith');
  },

  /**
   * Serial type for SQLite3 database backend.
   *
   * Serial in SQLite3 are actually just integers. You need to make the
   * column also a primary key column and it will track the `ROWID` column.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   * @see https://www.sqlite.org/autoinc.html
   */
  typeForSerial: function() { return 'integer'; },

  typeForFloat: function() { return 'real'; },

  /**
   * Boolean type for SQLite3 database backend.
   *
   * Booleans in SQLite3 are actually stored as numbers. A value of 0 is
   * considered false. Nonzero values are considered true.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForBool: function() { return this._super.apply(this, arguments); },

  /**
   * Date type for SQLite3 database backend.
   *
   * Dates in SQLite3 are stored as numeric timestamps since SQLite3 does not
   * have a date type.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForDate: function() { return this._super.apply(this, arguments); },

  /**
   * Date-time type for SQLite3 database backend.
   *
   * Date-times in SQLite3 are stored as numeric timestamps since SQLite3
   * does not have a date-time type.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForDateTime: function() { return this._super.apply(this, arguments); },

  /**
   * Decimal type for SQLite3 database backend.
   *
   * Decimals in SQLite3 do not support precision or scale.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForDecimal: function() { return 'decimal'; }

});

module.exports = SQLite3Translator.reopenClass({ __name__: 'SQLite3Translator' });
