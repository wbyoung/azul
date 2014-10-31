'use strict';

var _ = require('lodash');
var BluebirdPromise = require('bluebird');
var Adapter = require('./base');
var sqlite3 = require('sqlite3');

BluebirdPromise.promisifyAll(sqlite3.Database.prototype);

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
 * SQLite3 Adapter
 *
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @constructor
 * @extends Adapter
 */
var SQLite3Adapter = Adapter.extend(/** @lends SQLite3Adapter# */ {

  init: function() {
    this._super.apply(this, arguments);
    this._connections = {};
    this._connectionID = 0;
    this._database = undefined;
    this._databasePromise = undefined;
  },

  /**
   * Get or create the a database for this adapter.
   *
   * @method
   * @private
   */
  _resolveDatabase: BluebirdPromise.method(function() {
    if (this._databasePromise) { return this._databasePromise; }

    var filename = this._connection.filename;
    var mode = this._connection.mode;
    var promise = new BluebirdPromise(function(resolve, reject) {
      var db = new sqlite3.Database(filename, mode)
        .on('open', function() { resolve(db); })
        .on('error', reject);
    })
    .bind(this).tap(function(db) {
      this._database = db;
    });

    return (this._databasePromise = promise);
  }),

  /**
   * Disconnect this adapter's database & setup to allow another one to be
   * created.
   *
   * @method
   * @private
   */
  _disconnectDatabase: BluebirdPromise.method(function() {
    var result = this._database.closeAsync();
    this._database = undefined;
    this._databasePromise = undefined;
    return result;
  }),

  /**
   * Connect for SQLite3Adapter.
   *
   * @method
   * @protected
   * @see {Adapter#_connect}
   */
  _connect: BluebirdPromise.method(function() {
    var id = (this._connectionID += 1);
    var result = this._connections[id] = { id: id };
    return this._resolveDatabase().bind(this).then(function(db) {
      return _.merge(result, { db: db });
    });
  }),

  /**
   * Disconnect for SQLite3Adapter.
   *
   * @method
   * @protected
   * @see {Adapter#_disconnect}
   */
  _disconnect: BluebirdPromise.method(function(connection) {
    delete this._connections[connection.id];
    return _.size(this._connections) === 0 &&
      this._disconnectDatabase();
  }),

  /**
   * Execute for SQLite3Adapter.
   *
   * @method
   * @private
   * @see {Adapter#_execute}
   */
  _execute: BluebirdPromise.method(function(connection, sql, args, id) {
    return BluebirdPromise.bind({})
    .then(function() {
      return new BluebirdPromise(function(resolve, reject) {
        var method = id.enabled ? 'run' : 'all';
        connection.db[method](sql, args, function(err, result) {
          if (err) { reject(err); }
          else { resolve([result, this]); }
        });
      });
    })
    .spread(function(result, details) {
      if (details.lastID) { id(details.lastID); }
      return {
        rows: result || [],
        fields: _.keys(_.reduce(result, _.extend, {})).sort()
      };
    });
  })

});

SQLite3Adapter.reopenClass(/** @lends SQLite3Adapter */ {

  Phrasing: Adapter.Phrasing.extend(),
  Translator: Adapter.Translator.extend({
    predicates: function(p) {
      this._super.apply(this, arguments);

      var likeFormat = '%s LIKE %s ESCAPE \'\\\'';
      p('iexact', likeFormat);
      p('contains', likeFormat, wrapValue(like, contains));
      p('icontains', likeFormat, wrapValue(like, contains));
      p('startsWith', likeFormat, wrapValue(like, startsWith));
      p('istartsWith', likeFormat, wrapValue(like, startsWith));
      p('endsWith', likeFormat, wrapValue(like, endsWith));
      p('iendsWith', likeFormat, wrapValue(like, endsWith));
      p('regex', '%s REGEXP %s', wrapValue(regex));
      p('iregex', '%s REGEXP \'(?i)\' || %s', wrapValue(regex));
    },

    type: function(type/*, options*/) {
      // TODO: handle more types & options
      var result;
      if (type === 'serial') { result = 'integer primary key autoincrement'; }
      else { result = this._super.apply(this, arguments); }
      return result;
    }
  }, { __name__: 'SQLite3Translator' })
});

SQLite3Adapter.Phrasing.reopen(EmbedPseudoReturn);
SQLite3Adapter.reopen(ExtractPseudoReturn);

module.exports = SQLite3Adapter.reopenClass({ __name__: 'SQLite3Adapter' });
