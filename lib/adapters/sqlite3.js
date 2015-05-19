'use strict';

var _ = require('lodash');
var BluebirdPromise = require('bluebird');
var Adapter = require('./base');
var Statement = require('../types/statement');
var util = require('util');
var sqlite3 = require('sqlite3');

BluebirdPromise.promisifyAll(sqlite3.Database.prototype);

var returning = require('./mixins/returning'),
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

var LIKE_FORMAT = '%s LIKE %s ESCAPE \'\\\'';
var ILIKE_FORMAT = 'UPPER(%s) LIKE UPPER(%s) ESCAPE \'\\\'';

SQLite3Adapter.reopenClass(/** @lends SQLite3Adapter */ {

  /**
   * @protected
   * @constructor
   * @extends Adapter.Phrasing
   */
  Phrasing: Adapter.Phrasing.extend({

    /**
     * Override of {@link Phrasing#begin}.
     *
     * @method
     * @public
     * @see {@link Phrasing#begin}.
     */
    begin: function(level) {
      return Statement.create(util.format('SAVEPOINT AZULJS_%d', level));
    },

    /**
     * Override of {@link Phrasing#rollback}.
     *
     * @method
     * @public
     * @see {@link Phrasing#rollback}.
     */
    rollback: function(level) {
      return Statement.create(util.format('ROLLBACK TO AZULJS_%d', level));
    },

    /**
     * Override of {@link Phrasing#commit}.
     *
     * @method
     * @public
     * @see {@link Phrasing#commit}.
     */
    commit: function(level) {
      return Statement.create(util.format('RELEASE AZULJS_%d', level));
    }

  }, { __name__: 'SQLite3Phrasing' }),

  /**
   * @protected
   * @constructor
   * @extends Adapter.Translator
   */
  Translator: Adapter.Translator.extend(/** @lends SQLite3Adapter.Translator */ {
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

  }, { __name__: 'SQLite3Translator' }),


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
      if (data.dropped.length === 0 && data.renamed.length === 0) {
        return undefined;
      }

      return function(baseQuery) {
        var table = data.name;
        var add = data.added;
        var drop = data.dropped;
        var renames = _.transform(data.renamed, function(obj, rename) {
          obj[rename.from] = rename;
        }, {});
        var fmt = util.format;
        var createColumn = this._phrasing.createColumn.bind(this._phrasing);
        var quote = this._grammar.field.bind(this._grammar);
        var newName = function(name) {
          return renames[name] ? renames[name].to : name;
        };

        var transaction = baseQuery.transaction();
        var query = baseQuery.transaction(transaction);

        return BluebirdPromise.bind({})
        .then(function() { return transaction.begin(); })
        .then(function() { return query.raw('PRAGMA defer_foreign_keys=1'); })
        .then(function() {
          return query.raw(fmt('PRAGMA table_info(%s)', quote(table))).fetch();
        })
        .then(function(columns) {
          this.columns = columns.filter(function(column) {
            return !_.contains(drop, column.name);
          });
        })
        .then(function() {
          return query.raw(fmt('PRAGMA foreign_key_list(%s)', quote(table)))
            .fetch();
        })
        .then(function(results) {
          this.foreignKeys = results.filter(function(fk) {
            return !_.contains(drop, fk.from);
          });
        })
        .then(function() {
          return query.raw(fmt('ALTER TABLE %s RENAME TO %s',
            quote(table), quote(table + '_old')));
        })
        .then(function() {
          var definitions = this.columns.map(function(column) {
            var name = newName(column.name);
            var defaultKey = 'dflt_value';
            var definition = fmt('%s %s', quote(name), column.type);
            if (column.pk) { definition += ' PRIMARY KEY'; }
            if (column.notnull) { definition += ' NOT NULL'; }
            if (column[defaultKey] !== null) {
              definition += ' DEFAULT ' + column[defaultKey];
            }
            return definition;
          })
          .concat(add.map(createColumn))
          .concat(this.foreignKeys.map(function(fk) {
            var deleteKey = 'on_delete';
            var updateKey = 'on_update';
            return fmt('FOREIGN KEY (%s) REFERENCES %s (%s) ' +
              'ON DELETE %s ON UPDATE %s MATCH %s',
              quote(fk.from), quote(fk.table), fk.to && quote(fk.to),
              fk[deleteKey], fk[updateKey], fk.match);
          }));
          return query.raw(fmt('CREATE TABLE %s (%s)',
            quote(table), definitions.join(', ')));
        })
        .then(function() {
          var oldFields = _.map(this.columns, 'name');
          var newFields = _.map(oldFields, newName);
          return query.raw(fmt('INSERT INTO %s (%s) SELECT %s FROM %s',
            quote(table),
            newFields.map(quote).join(', '),
            oldFields.map(quote).join(', '),
            quote(table + '_old')));
        })
        .then(function() {
          return query.raw(fmt('DROP TABLE %s', quote(table + '_old')));
        })
        .then(function() { return transaction.commit(); })
        .catch(function(e) { return BluebirdPromise.resolve(transaction.rollback()).throw(e); });
      }.bind(this);
    },

  }, { __name__: 'SQLite3Procedures' }),

});

SQLite3Adapter.Phrasing.reopen(EmbedPseudoReturn);
SQLite3Adapter.reopen(ExtractPseudoReturn);

module.exports = SQLite3Adapter.reopenClass({ __name__: 'SQLite3Adapter' });
