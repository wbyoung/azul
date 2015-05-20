'use strict';

var _ = require('lodash');
var Adapter = require('../base');
var PullIndexProcedure = require('../mixins/pull_index');
var BluebirdPromise = require('bluebird');
var util = require('util');

/**
 * @protected
 * @constructor
 * @extends Adapter.Procedures
 * @mixes PullIndexProcedure
 */
var SQLite3Procedures = Adapter.Procedures.extend(PullIndexProcedure, {

  /**
   * Override of {@link Procedure#alterTable}.
   *
   * @method
   * @public
   * @see {@link Procedure#alterTable}.
   */
  alterTable: function(data) {
    // we know the phrasing is capable of handling one index creation. we need
    // to create a procedure if there are more operations required than the
    // phrasing is able to represent in a single query.
    var procedure;
    var possible = Math.min(data.addedIndexes.length, 1);
    var operations =
      data.dropped.length +
      data.renamed.length +
      data.addedIndexes.length;

    if (operations > possible) {
      procedure = this._inTransaction(true, function(query) {
        var table = data.name;
        var add = data.added;
        var drop = data.dropped;
        var renames = _.transform(data.renamed, function(obj, rename) {
          obj[rename.from] = rename;
        }, {});
        var fmt = util.format;
        var columnFragment = this._phrasing.columnFragment.bind(this._phrasing);
        var createIndex = this._phrasing.createIndex.bind(this._phrasing);
        var quote = this._grammar.field.bind(this._grammar);
        var newName = function(name) {
          return renames[name] ? renames[name].to : name;
        };

        var promise = BluebirdPromise.bind({})
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
          return query.raw(fmt('PRAGMA index_list(%s)',
            quote(table))).fetch();
        })
        .map(function(index) {
          var q = fmt('PRAGMA index_info(%s)', quote(index.name));
          return BluebirdPromise.props({
            name: index.name,
            info: query.raw(q).fetch(),
          });
        })
        .then(function(results) { this.indexes = results; })
        .then(function() {
          return query.raw(fmt('PRAGMA foreign_key_list(%s)',
            quote(table))).fetch();
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
          .concat(add.map(columnFragment))
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
        .then(function() { return this.indexes; })
        .map(function(index) {
          var info = index.info;
          var indexObject = {
            name: index.name,
            columns: _.map(info, 'name'),
          };
          return query.raw(createIndex(data.name, indexObject));
        });

        data.addedIndexes.forEach(function(index) {
          promise = promise.then(function() {
            return query.raw(createIndex(data.name, index));
          });
        }, this);

        return promise;
      }.bind(this));
    }

    return procedure;
  },

});

module.exports = SQLite3Procedures.reopenClass({ __name__: 'SQLite3Procedures' });
