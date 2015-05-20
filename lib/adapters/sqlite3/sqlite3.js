'use strict';

var _ = require('lodash');
var BluebirdPromise = require('bluebird');
var Adapter = require('../base');
var sqlite3 = require('sqlite3');

BluebirdPromise.promisifyAll(sqlite3.Database.prototype);

var returning = require('../mixins/returning'),
  EmbedPseudoReturn = returning.EmbedPseudoReturn,
  ExtractPseudoReturn = returning.ExtractPseudoReturn;

/**
 * SQLite3 Adapter.
 *
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
   * @see {@link Adapter#_connect}
   */
  _connect: BluebirdPromise.method(function() {
    var id = (this._connectionID += 1);
    var result = this._connections[id] = { id: id };
    return this._resolveDatabase().bind(this)
    .then(function(db) {
      return _.merge(result, { db: db });
    })
    .tap(function(connection) {
      return this._execute(connection, 'PRAGMA case_sensitive_like=ON', [], {});
    })
    .tap(function(connection) {
      return this._execute(connection, 'PRAGMA foreign_keys=ON', [], {});
    });
  }),

  /**
   * Disconnect for SQLite3Adapter.
   *
   * @method
   * @protected
   * @see {@link Adapter#_disconnect}
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
   * @see {@link Adapter#_execute}
   */
  _execute: BluebirdPromise.method(function(connection, sql, args, returning) {
    return BluebirdPromise.bind({})
    .then(function() {
      return new BluebirdPromise(function(resolve, reject) {
        var method = returning.enabled ? 'run' : 'all';
        connection.db[method](sql, args, function(err, result) {
          if (err) { reject(err); }
          else { resolve([result, this]); }
        });
      });
    })
    .spread(function(result, details) {
      if (details.lastID) { returning(details.lastID); }
      return {
        rows: result || [],
        fields: _.keys(_.reduce(result, _.extend, {})).sort()
      };
    });
  })

});


SQLite3Adapter.reopenClass(/** @lends SQLite3Adapter */ {
  Phrasing: require('./phrasing'),
  Translator: require('./translator'),
  Procedures: require('./procedures'),
});

SQLite3Adapter.Phrasing.reopen(EmbedPseudoReturn);
SQLite3Adapter.reopen(ExtractPseudoReturn);

module.exports = SQLite3Adapter.reopenClass({ __name__: 'SQLite3Adapter' });
