'use strict';

var _ = require('lodash');
var BluebirdPromise = require('bluebird');
var Adapter = require('../base');
var util = require('util');


/**
 * @protected
 * @constructor
 * @extends Adapter.Procedures
 */
var SQLite3Procedures = Adapter.Procedures.extend({

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

});

module.exports = SQLite3Procedures.reopenClass({ __name__: 'SQLite3Procedures' });
