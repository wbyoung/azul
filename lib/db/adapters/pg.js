'use strict';

var _ = require('lodash');
var BluebirdPromise = require('bluebird');
var Adapter = require('./base');
var Fragment = require('../grammar/fragment');
var pg = BluebirdPromise.promisifyAll(require('pg'));
BluebirdPromise.promisifyAll(pg.Client.prototype);

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
    var connection = this._connection;
    connection = _.isString(connection) ? connection :
      _.pick(connection, 'user', 'database', 'password', 'port', 'host', 'ssl');

    var client = new pg.Client(connection);
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
        fields: _.map(result.fields, 'name'),
        command: result.command
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
    }
  }, { __name__: 'PGTranslator' })
});

module.exports = PGAdapter.reopenClass({ __name__: 'PGAdapter' });
