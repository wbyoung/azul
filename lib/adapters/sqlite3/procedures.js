'use strict';

var _ = require('lodash');
var Adapter = require('../base');
var PullIndexProcedure = require('../mixins/pull_index');
var Promise = require('bluebird');
var util = require('util');

/**
 * Create function for accessing bound property.
 *
 * @function SQLite3Procedures~access
 * @private
 * @param {String} property
 * @return {Function}
 */
var access = function(property) {
  return function() { return this[property]; };
};

/**
 * Create function for setting bound property.
 *
 * @function SQLite3Procedures~assign
 * @private
 * @param {String} property
 * @return {Function}
 */
var assign = function(property) {
  return function(result) { this[property] = result; };
};

/**
 * Create function for concatenating on bound property.
 *
 * @function SQLite3Procedures~concat
 * @private
 * @param {String} property
 * @return {Function}
 */
var concat = function(property) {
  return function(result) {
    this[property] = this[property].concat(result);
  };
};

/**
 * Create function for plucking attr.
 *
 * @function SQLite3Procedures~pluck
 * @private
 * @param {String} property
 * @return {Function}
 */
var pluck = function(attr) {
  return _.partial(_.pluck, _, attr);
};

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
    // we know the phrasing is capable of handling one index creation or index
    // drop. we need to create a procedure if there are more operations
    // required than the phrasing is able to represent in a single query.
    var self = this;
    var procedure;
    var possible =
      Math.min(data.addedIndexes.length, 1) ||
      Math.min(data.droppedIndexes.length, 1);
    var operations =
      data.dropped.length +
      data.renamed.length +
      data.addedIndexes.length +
      data.droppedIndexes.length +
      data.renamedIndexes.length;

    if (operations > possible) {
      procedure = self._inTransaction(true, function(query) {
        var table = data.name;
        var fmt = util.format;
        var quote = self._grammar.field.bind(self._grammar);
        var newName = function(data, name) {
          return _.result(_.find(data, 'from', name), 'to') || name;
        };
        var newColumnName = _.partial(newName, data.renamed);
        var newIndexName = _.partial(newName, data.renamedIndexes);

        // any drops, or renames make re-creating the table a necessity. we
        // handle adds as part of this procedure, too, to (because adding a
        // column via alter table is probably the same ideas as this
        // procedure).
        var recreateTable = (
          data.added.length +
          data.dropped.length +
          data.renamed.length) > 0;

        // create a raw query by formatting with given args & fetch
        var raw = function() {
          return query.raw(fmt.apply(null, arguments)).fetch();
        };

        // check if column was dropped
        var isDroppedColumn = function(dbcol) {
          return _.contains(data.dropped, dbcol.name);
        };
        var notDroppedColumn = _.negate(isDroppedColumn);

        // check if foreign key from column was dropped
        var isDroppedForeignKey = function(dbfk) {
          return _.contains(data.dropped, dbfk.from);
        };
        var notDroppedForeignKey = _.negate(isDroppedForeignKey);

        // defer foreign keys (must run in transaction)
        var deferForeignKeys = function() {
          return raw('PRAGMA defer_foreign_keys=1');
        };

        // get table info. result is an array of dbcol objects
        var inspectTableColumns = function() {
          return raw('PRAGMA table_info(%s)', quote(table));
        };

        // get table foreign keys, result is an array of dbfk objects
        var inspectTableForeignKeys = function() {
          return raw('PRAGMA foreign_key_list(%s)', quote(table));
        };

        // get table indexes, result is an array of detail objects
        // use the name from those as input to `inspectIndex`
        var inspectTableIndexes = function() {
          return raw('PRAGMA index_list(%s)', quote(table));
        };

        // get table indexes, result is an array of dbindex objects with a key
        // `name` and a key `columns`
        var inspectIndex = function(index) {
          return Promise.props({
            name: index,
            columns: raw('PRAGMA index_info(%s)', quote(index)),
          });
        };

        // map value returned from dbindex to azul compatible objects & handle
        // renames in the process.
        var mapIndex = function(index) { // db index -> azul index
          return {
            name: newIndexName(index.name),
            columns: _.map(index.columns, 'name'),
          };
        };

        // move table aside to temporary location
        var moveAside = function() {
          return raw('ALTER TABLE %s RENAME TO %s',
            quote(table), quote(table + '_old'));
        };

        // create replacement table
        var createTable = function() {
          var dbcols = this.dbcols.filter(notDroppedColumn);
          var dbfks = this.dbfks.filter(notDroppedForeignKey);
          var phrasing = self._phrasing;
          var columnFragment = phrasing.columnFragment.bind(phrasing);
          var definitions = dbcols.map(function(column) {
            var name = newColumnName(column.name);
            var defaultKey = 'dflt_value';
            var definition = fmt('%s %s', quote(name), column.type);
            if (column.pk) { definition += ' PRIMARY KEY'; }
            if (column.notnull) { definition += ' NOT NULL'; }
            if (column[defaultKey] !== null) {
              definition += ' DEFAULT ' + column[defaultKey];
            }
            return definition;
          })
          .concat(data.added.map(columnFragment))
          .concat(dbfks.map(function(fk) {
            var deleteKey = 'on_delete';
            var updateKey = 'on_update';
            return fmt('FOREIGN KEY (%s) REFERENCES %s (%s) ' +
              'ON DELETE %s ON UPDATE %s MATCH %s',
              quote(fk.from), quote(fk.table), fk.to && quote(fk.to),
              fk[deleteKey], fk[updateKey], fk.match);
          }));
          return raw('CREATE TABLE %s (%s)',
            quote(table), definitions.join(', '));
        };

        // fill replacement table with data
        var transferData = function() {
          var dbcols = this.dbcols.filter(notDroppedColumn);
          var oldFields = _.map(dbcols, 'name');
          var newFields = _.map(oldFields, newColumnName);
          return raw('INSERT INTO %s (%s) SELECT %s FROM %s',
            quote(table),
            newFields.map(quote).join(', '),
            oldFields.map(quote).join(', '),
            quote(table + '_old'));
        };

        // drop temporary table (the one that had been moved aside)
        var dropTemporary = function() {
          return raw('DROP TABLE %s', quote(table + '_old'));
        };

        // create an index
        var createIndex = function(index) {
          return query.raw(self._phrasing.createIndex(data.name, index));
        };

        // drop an index
        var dropIndex = function(index) {
          return query.raw(self._phrasing.dropIndex(data.name, index));
        };


        var promise = Promise.bind({
          indexes: [],
          droppedIndexes: [],
          inspectIndexes: [],
        });

        // if recreating table, get info needed to re-create the table
        promise = !recreateTable ? promise : promise
          .then(deferForeignKeys)
          .then(inspectTableColumns)
          .then(assign('dbcols'))
          .then(inspectTableIndexes)
          .then(pluck('name'))
          .then(concat('inspectIndexes'));

        // if not recreating the table, get index info for renamed indexes.
        promise = recreateTable ? promise : promise
          .return(data.renamedIndexes)
          .then(pluck('from'))
          .then(concat('inspectIndexes'));

        // always get info on indexes
        promise = promise
          .then(access('inspectIndexes'))
          .then(_.unique)
          .map(inspectIndex)
          .map(mapIndex)
          .then(concat('indexes'));

        // if recreating table, get foreign keys
        promise = !recreateTable ? promise : promise
          .then(inspectTableForeignKeys)
          .then(assign('dbfks'));

        // if recreating table, move table aside, create new table, move data
        promise = !recreateTable ? promise : promise
          .then(moveAside)
          .then(createTable)
          .then(transferData)
          .then(dropTemporary);

        // if not recreating the table, add the `from` value of renamed indexes
        // to the list of dropped indexes.
        promise = recreateTable ? promise : promise
          .return(data.renamedIndexes)
          .then(pluck('from'))
          .then(concat('droppedIndexes'));

        // always drop & create indexes as needed
        promise = promise
          .return(data.droppedIndexes)
          .then(concat('droppedIndexes'))
          .then(access('droppedIndexes'))
          .map(dropIndex)
          .return(data.addedIndexes)
          .then(concat('indexes'))
          .then(access('indexes'))
          .map(createIndex);

        return promise;
      });
    }

    return procedure;
  },

});

module.exports = SQLite3Procedures.reopenClass({ __name__: 'SQLite3Procedures' });
