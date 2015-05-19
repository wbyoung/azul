'use strict';

var _ = require('lodash');
var BluebirdPromise = require('bluebird');
var Adapter = require('./base');
var Fragment = require('../types/fragment');
var date = require('../util/date');
var util = require('util');
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

  }, { __name__: 'PGTranslator' }),

  /**
   * @protected
   * @constructor
   * @extends Adapter.Procedures
   */
  Procedures: Adapter.Procedures.extend({

    /**
     * Override of {@link Procedure#alterTable}.
     *
     * @method
     * @public
     * @see {@link Procedure#alterTable}.
     */
    alterTable: function(data) {
      if (data.renamed.length === 0) { return undefined; }

      var procedure;
      var statement =
        this._phrasing.alterTable(_.extend({}, data, { renamed: [] }));

      // we need to create a procedure if there are multiple queries. either
      // multiple renames or a single rename & the statement for anything
      // else (add/drop columns).
      if (data.renamed.length > 1 || statement) {
        procedure = function(baseQuery) {
          var transaction = baseQuery.transaction();
          var query = baseQuery.transaction(transaction);
          var table = data.name;
          var fmt = util.format;
          var quote = this._grammar.field.bind(this._grammar);
          var promise = transaction.begin();

          if (statement) {
            promise = promise.then(function() {
              return query.raw(statement.sql, statement.args);
            });
          }

          data.renamed.forEach(function(rename) {
            promise = promise.then(function() {
              return query.raw(fmt('ALTER TABLE %s RENAME %s TO %s',
                quote(table), quote(rename.from), quote(rename.to)));
            });
          });

          return promise
          .then(function() { return transaction.commit(); })
          .catch(function(e) {
            return transaction.rollback().execute().throw(e);
          });
        }.bind(this);
      }

      return procedure;
    },

  }, { __name__: 'SQLite3Procedures' }),

});

module.exports = PGAdapter.reopenClass({ __name__: 'PGAdapter' });
