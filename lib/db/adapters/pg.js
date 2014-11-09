'use strict';

var _ = require('lodash');
var BluebirdPromise = require('bluebird');
var Adapter = require('./base');
var Fragment = require('../grammar/fragment');
var pg = BluebirdPromise.promisifyAll(require('pg'));
BluebirdPromise.promisifyAll(pg.Client.prototype);

var date = require('../../util/date');
var like = Adapter.Translator.like,
  contains = Adapter.Translator.contains,
  startsWith = Adapter.Translator.startsWith,
  endsWith = Adapter.Translator.endsWith,
  wrapValue = Adapter.Translator.wrapValue;

// NOTE: use this to request all tables in a database
// SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
// SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public';

/**
 * Postgres Adapter
 *
 * Documentation forthcoming.
 *
 * @since 1.0
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
   * @see {Adapter#_connect}
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
   * @see {Adapter#_disconnect}
   */
  _disconnect: BluebirdPromise.method(function(client) {
    return client.end();
  }),

  /**
   * Execute for PGAdapter.
   *
   * @method
   * @private
   * @see {Adapter#_execute}
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

PGAdapter.reopenClass(/** @lends PGAdapter */{
  Grammar: Adapter.Grammar.extend({
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

  Translator: Adapter.Translator.extend({
    predicates: function(p) {
      this._super.apply(this, arguments);
      this._predicatesForPGStrings(p);
      this._predicaetesForPGDates(p);
    },

    _predicatesForPGStrings: function(p) {
      p('iexact',
        'UPPER(%s::text) = UPPER(%s)');
      p('contains',
        '%s::text LIKE %s', wrapValue(like, contains));
      p('icontains',
        'UPPER(%s::text) LIKE UPPER(%s)', wrapValue(like, contains));
      p('startsWith',
        '%s::text LIKE %s', wrapValue(like, startsWith));
      p('istartsWith',
        'UPPER(%s::text) LIKE UPPER(%s)', wrapValue(like, startsWith));
      p('endsWith',
        '%s::text LIKE %s', wrapValue(like, endsWith));
      p('iendsWith',
        'UPPER(%s::text) LIKE UPPER(%s)', wrapValue(like, endsWith));
    },

    _predicaetesForPGDates: function(p) {
      p('year', /^year$/i, 'EXTRACT(\'year\' FROM %s) = %s');
      p('month', /^month$/i, 'EXTRACT(\'month\' FROM %s) = %s');
      p('day', /^day$/i, 'EXTRACT(\'day\' FROM %s) = %s');
      p('weekday', /^weekday$/i, 'EXTRACT(\'dow\' FROM %s) = %s',
        wrapValue(date.parseWeekdayToInt));
    },

    typeForBinary: function() { return 'bytea'; },

    /**
     * 64 bit integer type for PostgreSQL database backend.
     *
     * Values returned when executing queries for 64 bit integer values in
     * PostgreSQL will result in strings since JavaScript does not have a
     * numeric type that can represent the same range as the PG 64 bit integer.
     *
     * @since 1.0
     * @public
     * @method
     * @see {@link Translator#type}
     */
    typeForInteger64: function() {
      return this._super.apply(this, arguments);
    },

    typeForBool: function() { return 'boolean'; },
    typeForDateTime: function() { return 'timestamptz'; },

    /**
     * Decimal type for PostgreSQL database backend.
     *
     * Values returned when executing queries for decimal values in PostgreSQL
     * will result in strings since JavaScript does not support a numeric type
     * that can represent the same range and precision as the PG decimal.
     *
     * @since 1.0
     * @public
     * @method
     * @see {@link Translator#type}
     */
    typeForDecimal: function() {
      return this._super.apply(this, arguments);
    }

  }, { __name__: 'PGTranslator' })
});

module.exports = PGAdapter.reopenClass({ __name__: 'PGAdapter' });
