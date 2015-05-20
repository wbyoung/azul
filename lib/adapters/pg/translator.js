'use strict';

var Adapter = require('../base');
var date = require('../../util/date');

/**
 * @protected
 * @constructor
 * @extends Adapter.Translator
 */
var PGTranslator = Adapter.Translator.extend(/** @lends PGAdapter.Translator */ {
  predicateForIExact: function(p) {
    return this._super(p).using('UPPER(%s::text) = UPPER(%s)');
  },
  predicateForContains: function(p) {
    return this._super(p).using('%s::text LIKE %s')
      .value('like', 'contains');
  },
  predicateForIContains: function(p) {
    return this._super(p).using('UPPER(%s::text) LIKE UPPER(%s)')
      .value('like', 'contains');
  },
  predicateForStartsWith: function(p) {
    return this._super(p).using('%s::text LIKE %s')
      .value('like', 'startsWith');
  },
  predicateForIStartsWith: function(p) {
    return this._super(p).using('UPPER(%s::text) LIKE UPPER(%s)')
      .value('like', 'startsWith');
  },
  predicateForEndsWith: function(p) {
    return this._super(p).using('%s::text LIKE %s')
      .value('like', 'endsWith');
  },
  predicateForIEndsWith: function(p) {
    return this._super(p).using('UPPER(%s::text) LIKE UPPER(%s)')
      .value('like', 'endsWith');
  },
  predicateForYear: function(p) {
    return this._super(p).using('EXTRACT(\'year\' FROM %s) = %s');
  },
  predicateForMonth: function(p) {
    return this._super(p).using('EXTRACT(\'month\' FROM %s) = %s');
  },
  predicateForDay: function(p) {
    return this._super(p).using('EXTRACT(\'day\' FROM %s) = %s');
  },
  predicateForWeekday: function(p) {
    return this._super(p).using('EXTRACT(\'dow\' FROM %s) = %s')
      .value(date.parseWeekdayToInt);
  },
  predicateForHour: function(p) {
    return this._super(p).using('EXTRACT(\'hour\' FROM %s) = %s');
  },
  predicateForMinute: function(p) {
    return this._super(p).using('EXTRACT(\'minute\' FROM %s) = %s');
  },
  predicateForSecond: function(p) {
    return this._super(p).using('EXTRACT(\'second\' FROM %s) = %s');
  },

  typeForBinary: function() { return 'bytea'; },

  /**
   * 64 bit integer type for PostgreSQL database backend.
   *
   * Values returned when executing queries for 64 bit integer values in
   * PostgreSQL will result in strings since JavaScript does not have a
   * numeric type that can represent the same range as the PG 64 bit integer.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForInteger64: function() {
    return this._super.apply(this, arguments);
  },

  typeForBool: function() { return 'boolean'; },
  typeForDateTime: function() { return 'timestamp'; },

  /**
   * Decimal type for PostgreSQL database backend.
   *
   * Values returned when executing queries for decimal values in PostgreSQL
   * will result in strings since JavaScript does not support a numeric type
   * that can represent the same range and precision as the PG decimal.
   *
   * @method
   * @public
   * @see {@link Translator#type}
   */
  typeForDecimal: function() {
    return this._super.apply(this, arguments);
  }

});

module.exports = PGTranslator.reopenClass({ __name__: 'PGTranslator' });
