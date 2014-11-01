'use strict';

var _ = require('lodash');
var BluebirdPromise = require('bluebird');
var Adapter = require('./base');
var mysql = require('mysql');

BluebirdPromise.promisifyAll(mysql);
BluebirdPromise.promisifyAll(require('mysql/lib/Connection').prototype);

var like = Adapter.Translator.like,
  contains = Adapter.Translator.contains,
  startsWith = Adapter.Translator.startsWith,
  endsWith = Adapter.Translator.endsWith,
  regex = Adapter.Translator.regex,
  wrapValue = Adapter.Translator.wrapValue;

var returning = require('./mixins/returning'),
  EmbedPseudoReturn = returning.EmbedPseudoReturn,
  ExtractPseudoReturn = returning.ExtractPseudoReturn;

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
var MySQLAdapter = Adapter.extend(/** @lends MySQLAdapter# */ {

  /**
   * Connect for MySQLAdapter.
   *
   * @method
   * @protected
   * @see {Adapter#_connect}
   */
  _connect: BluebirdPromise.method(function() {
    return mysql.createConnection(this._connection);
  }),

  /**
   * Disconnect for MySQLAdapter.
   *
   * @method
   * @protected
   * @see {Adapter#_disconnect}
   */
  _disconnect: BluebirdPromise.method(function(connection) {
    return connection.end();
  }),

  /**
   * Execute for MySQLAdapter.
   *
   * @method
   * @private
   * @see {Adapter#_execute}
   */
  _execute: BluebirdPromise.method(function(connection, sql, args, id) {
    return BluebirdPromise.bind({})
    .then(function() {
      return connection.queryAsync(sql, args);
    })
    .spread(function(rows, fields) {
      if (rows.insertId) { id(rows.insertId); }
      return {
        rows: fields ? rows : [],
        fields: _.map(fields, 'name')
      };
    });
  })

});

MySQLAdapter.reopenClass(/** @lends MySQLAdapter */ {

  Phrasing: Adapter.Phrasing.extend(),
  Grammar: Adapter.Grammar.extend({
    quote: function(string) {
      return '`' + string + '`';
    }
  }, { __name__: 'MySQLGrammar' }),

  Translator: Adapter.Translator.extend({
    predicates: function(p) {
      this._super.apply(this, arguments);
      p('iexact', '%s LIKE %s');
      p('contains', '%s LIKE BINARY %s', wrapValue(like, contains));
      p('icontains', '%s LIKE %s', wrapValue(like, contains));
      p('startsWith', '%s LIKE BINARY %s', wrapValue(like, startsWith));
      p('istartsWith', '%s LIKE %s', wrapValue(like, startsWith));
      p('endsWith', '%s LIKE BINARY %s', wrapValue(like, endsWith));
      p('iendsWith', '%s LIKE %s', wrapValue(like, endsWith));
      p('regex', '%s REGEXP BINARY %s', wrapValue(regex));
      p('iregex', '%s REGEXP %s', wrapValue(regex));
    },

    typeForSerial: function() { return 'integer primary key auto_increment'; }

  }, { __name__: 'MySQLTranslator' })
});

MySQLAdapter.Phrasing.reopen(EmbedPseudoReturn);
MySQLAdapter.reopen(ExtractPseudoReturn);

module.exports = MySQLAdapter.reopenClass({ __name__: 'MySQLAdapter' });
