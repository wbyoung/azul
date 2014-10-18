'use strict';

var _ = require('lodash');
var util = require('util');
var Class = require('../../util/class');
var Statement = require('./statement');
var FieldString = require('../condition/field');

/**
 * Documentation forthcoming.
 *
 * Just for building conditions.
 *
 * @since 1.0
 * @public
 * @constructor
 * @param {Grammar} grammar The grammar to use when building phrases.
 */
var Phrasing = Class.extend(/** @lends Phrasing# */{
  init: function (grammar, translator) {
    this._super();
    this._grammar = grammar;
    this._translator = translator;
  },


  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   * @return {Fragment} The where fragment.
   */
  where: function(condition) {
    return this._grammar.join([
      'where', ' ', condition.build(this._grammar, this._translator)]);
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   * @return {Fragment} The join fragment.
   */
  join: function(join) {
    var fragments = [util.format('%s join %s', join.type, join.table)];
    if (join.condition) {
      fragments.push(' on ', join.condition.build(
        this._grammar,
        this._translator));
    }
    return this._grammar.join(fragments);
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   * @param {String|Array} data.columns The columns to select. This will be a string,
   * `*` when the request is for all columns. Otherwise, it will be an array of
   * strings representing the column names. The strings may be qualified with the
   * table name, in which case they would use a dot to separate the field from
   * the column. For example, `articles.title` would refer to the `title` column
   * of the `articles` table.
   * @return {Statement} The select statement.
   */
  select: function(data) {
    var tables = data.tables;
    var columns = data.columns;
    var joins = data.joins;
    var where = data.where;
    var quote = this._grammar.field.bind(this._grammar);
    var quotedColumns = columns === '*' ? [columns] : columns.map(quote);
    var delimitedColumns = this._grammar.delimit(quotedColumns);
    var delimitedTables = this._grammar.delimit(tables);
    var fragments = [].concat(['select '],
      delimitedColumns, [' from '], delimitedTables);

    if (where) { fragments.push(' ', this.where(where)); }

    joins.forEach(function(join) {
      fragments.push(' ', this.join(join));
    }, this);

    return Statement.create(this._grammar.join(fragments));
  },

  /**
   * Documentation forthcoming.
   */
  insert: function(data) {
    var table = data.table;
    var quoteField = this._grammar.field.bind(this._grammar);
    var quoteValue = this._grammar.value.bind(this._grammar);

    var columns = _(data.values)
      .map(_.keys)
      .flatten()
      .uniq()
      .value();

    var valueGroups = data.values.map(function(value) {
      var values = columns.map(function(col) {
        return value[col];
      })
      .map(function(value) {
        return value instanceof FieldString.__class__ ?
          quoteField(value) :
          quoteValue(value);
      });
      values = this._grammar.delimit(values);
      values = this._grammar.join(values);
      values = this._grammar.group(values);
      values = this._grammar.join(values);
      return values;
    }, this);

    valueGroups = this._grammar.delimit(valueGroups);
    valueGroups = this._grammar.join(valueGroups);
    columns = this._grammar.delimit(columns.map(quoteField));
    columns = this._grammar.group(this._grammar.join(columns));
    var fragments = [].concat(['INSERT INTO '], [quoteField(table)],
      [' '], columns, [' VALUES '], valueGroups);
    return Statement.create(this._grammar.join(fragments));
  },

  /**
   * Documentation forthcoming.
   */
  createTable: function(data) {
    var options = data.options;
    var columns = data.columns.map(function(column) {
      var type = this._translator.type(column.type, column.typeOptions);
      return util.format('%s %s', column.name, type);
    }, this);
    var delimitedColumns = this._grammar.delimit(columns);
    var joinedColumns = this._grammar.join(delimitedColumns);
    var groupedColumns = this._grammar.group(joinedColumns);
    var fragments = ['create table '];
    if (options.ifNotExists) {
      fragments.push('if not exists ');
    }
    fragments.push(util.format('%s ', data.name));
    fragments = fragments.concat(groupedColumns);
    return Statement.create(this._grammar.join(fragments));
  },

  /**
   * Documentation forthcoming.
   */
  dropTable: function(data) {
    var options = data.options;
    var fragments = ['drop table '];
    if (options.ifExists) {
      fragments.push('if exists ');
    }
    fragments.push(data.name);
    return Statement.create(this._grammar.join(fragments));
  }
});

module.exports = Phrasing.reopenClass({ __name__: 'Phrasing' });
