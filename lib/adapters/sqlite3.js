'use strict';

var _ = require('lodash');
var BluebirdPromise = require('bluebird');
var Adapter = require('./base');
var sqlite3 = require('sqlite3');

BluebirdPromise.promisifyAll(sqlite3.Database.prototype);

var returning = require('./mixins/returning'),
  EmbedPseudoReturn = returning.EmbedPseudoReturn,
  ExtractPseudoReturn = returning.ExtractPseudoReturn;

/**
 * SQLite3 Adapter.
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

var LIKE_FORMAT = '%s LIKE %s ESCAPE \'\\\'';

SQLite3Adapter.reopenClass(/** @lends SQLite3Adapter */ {

  /**
   * @since 1.0
   * @protected
   * @constructor
   * @extends Adapter.Phrasing
   */
  Phrasing: Adapter.Phrasing.extend(),

  /**
   * @since 1.0
   * @protected
   * @constructor
   * @extends Adapter.Translator
   */
  Translator: Adapter.Translator.extend(/** @lends SQLite3Adapter.Translator */ {
    predicates: function(p) {
      this._super.apply(this, arguments);
      this._predicatesSQLite3Generic(p);
      this._predicatesForSQLite3StringSearch(p);
      this._predicatesForSQLite3StringBoundaries(p);
    },

    _predicatesSQLite3Generic: function(p) {
      p('iexact').using(LIKE_FORMAT);
    },

    _predicatesForSQLite3StringSearch: function(p) {
      p('contains').using(LIKE_FORMAT).value('like', 'contains');
      p('icontains').using(LIKE_FORMAT).value('like', 'contains');
      p('regex').using('%s REGEXP %s').value('regex');
      p('iregex').using('%s REGEXP \'(?i)\' || %s').value('regex');
    },

    _predicatesForSQLite3StringBoundaries: function(p) {
      p('startsWith').using(LIKE_FORMAT).value('like', 'startsWith');
      p('istartsWith').using(LIKE_FORMAT).value('like', 'startsWith');
      p('endsWith').using(LIKE_FORMAT).value('like', 'endsWith');
      p('iendsWith').using(LIKE_FORMAT).value('like', 'endsWith');
    },

    typeForSerial: function() { return 'integer primary key autoincrement'; },
    typeForFloat: function() { return 'real'; },

    /**
     * Boolean type for SQLite3 database backend.
     *
     * Booleans in SQLite3 are actually stored as numbers. A value of 0 is
     * considered false. Nonzero values are considered true.
     *
     * @since 1.0
     * @public
     * @method
     * @see {@link Translator#type}
     */
    typeForBool: function() { return this._super.apply(this, arguments); },

    /**
     * Date type for SQLite3 database backend.
     *
     * Dates in SQLite3 are stored as numeric timestamps since SQLite3 does not
     * have a date type.
     *
     * @since 1.0
     * @public
     * @method
     * @see {@link Translator#type}
     */
    typeForDate: function() { return this._super.apply(this, arguments); },

    /**
     * Date-time type for SQLite3 database backend.
     *
     * Date-times in SQLite3 are stored as numeric timestamps since SQLite3
     * does not have a date-time type.
     *
     * @since 1.0
     * @public
     * @method
     * @see {@link Translator#type}
     */
    typeForDateTime: function() { return this._super.apply(this, arguments); },

    /**
     * Decimal type for SQLite3 database backend.
     *
     * Decimals in SQLite3 do not support precision or scale.
     *
     * @since 1.0
     * @public
     * @method
     * @see {@link Translator#type}
     */
    typeForDecimal: function() { return 'decimal'; }

  }, { __name__: 'SQLite3Translator' })
});

SQLite3Adapter.Phrasing.reopen(EmbedPseudoReturn);
SQLite3Adapter.reopen(ExtractPseudoReturn);

module.exports = SQLite3Adapter.reopenClass({ __name__: 'SQLite3Adapter' });
