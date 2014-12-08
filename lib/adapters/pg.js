'use strict';

var _ = require('lodash');
var BluebirdPromise = require('bluebird');
var Adapter = require('./base');
var Fragment = require('../grammar/fragment');
var date = require('../util/date');
var pg = BluebirdPromise.promisifyAll(require('pg'));
BluebirdPromise.promisifyAll(pg.Client.prototype);


// NOTE: use this to request all tables in a database
// SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
// SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public';

/**
 * PostgreSQL Adapter.
 *
 * @public
 * @constructor
 * @extends Adapter
 */
var PGAdapter = Adapter.extend(/** @lends PGAdapter# */ {

  /**
   * Connect for PGAdapter.
   *
   * @method
   * @protected
   * @see {@link Adapter#_connect}
   */
  _connect: BluebirdPromise.method(function() {
    var client = new pg.Client(this._connection);
    return client.connectAsync().return(client);
  }),

  /**
   * Disconnect for PGAdapter.
   *
   * @method
   * @protected
   * @see {@link Adapter#_disconnect}
   */
  _disconnect: BluebirdPromise.method(function(client) {
    return client.end();
  }),

  /**
   * Execute for PGAdapter.
   *
   * @method
   * @private
   * @see {@link Adapter#_execute}
   */
  _execute: BluebirdPromise.method(function(client, sql, args) {
    return BluebirdPromise.bind({})
    .then(function() {
      return client.queryAsync(sql, args);
    })
    .then(function(result) {
      return {
        rows: result.rows,
        fields: _.map(result.fields, 'name')
      };
    });
  })

});

PGAdapter.reopenClass(/** @lends PGAdapter */ {
  /**
   * @protected
   * @constructor
   * @extends Adapter.Grammar
   */
  Grammar: Adapter.Grammar.extend(/** @lends PGAdapter.Grammar */ {
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
  }, { __name__: 'PGGrammar' }),

  /**
   * @protected
   * @constructor
   * @extends Adapter.Translator
   */
  Translator: Adapter.Translator.extend(/** @lends PGAdapter.Translator */ {
    predicates: function(p) {
      this._super.apply(this, arguments);
      this._predicatesPGGeneric(p);
      this._predicatesForPGStringSearch(p);
      this._predicatesForPGStringBoundaries(p);
      this._predicatesForPGDates(p);
      this._predicatesForPGTimes(p);
    },

    _predicatesPGGeneric: function(p) {
      p('iexact').using('UPPER(%s::text) = UPPER(%s)');
    },

    _predicatesForPGStringSearch: function(p) {
      p('contains').using('%s::text LIKE %s')
        .value('like', 'contains');
      p('icontains').using('UPPER(%s::text) LIKE UPPER(%s)')
        .value('like', 'contains');
    },

    _predicatesForPGStringBoundaries: function(p) {
      p('startsWith').using('%s::text LIKE %s')
        .value('like', 'startsWith');
      p('istartsWith').using('UPPER(%s::text) LIKE UPPER(%s)')
        .value('like', 'startsWith');
      p('endsWith').using('%s::text LIKE %s')
        .value('like', 'endsWith');
      p('iendsWith').using('UPPER(%s::text) LIKE UPPER(%s)')
        .value('like', 'endsWith');
    },

    _predicatesForPGDates: function(p) {
      var parseWeekday = date.parseWeekdayToInt;
      p('year').using('EXTRACT(\'year\' FROM %s) = %s');
      p('month').using('EXTRACT(\'month\' FROM %s) = %s');
      p('day').using('EXTRACT(\'day\' FROM %s) = %s');
      p('weekday').using('EXTRACT(\'dow\' FROM %s) = %s').value(parseWeekday);
    },

    _predicatesForPGTimes: function(p) {
      p('hour').using('EXTRACT(\'hour\' FROM %s) = %s');
      p('minute').using('EXTRACT(\'minute\' FROM %s) = %s');
      p('second').using('EXTRACT(\'second\' FROM %s) = %s');
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

  }, { __name__: 'PGTranslator' })
});

module.exports = PGAdapter.reopenClass({ __name__: 'PGAdapter' });
