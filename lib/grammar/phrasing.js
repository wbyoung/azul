'use strict';

var _ = require('lodash');
var Class = require('../util/class');
var Statement = require('./statement');

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
      'WHERE', ' ', condition.build(this._grammar, this._translator)
    ]);
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   * @return {Fragment} The order fragment.
   */
  order: function(orderSpecifications) {
    var quote = this._grammar.field.bind(this._grammar);
    var delimit = this._grammar.delimit.bind(this._grammar);
    var join = this._grammar.join.bind(this._grammar);
    var orderings = orderSpecifications.map(function(order) {
      return join([quote(order.field), ' ', order.direction.toUpperCase()]);
    });
    var fragments = ['ORDER BY '].concat(delimit(orderings));
    return join(fragments);
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
    var quote = this._grammar.field.bind(this._grammar);
    var fragments = [join.type.toUpperCase(), ' JOIN ', quote(join.table)];
    if (join.condition) {
      fragments.push(' ON ', join.condition.build(
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
    var order = data.order;
    var quote = this._grammar.field.bind(this._grammar);
    var quotedColumns = columns === '*' ? [columns] : columns.map(quote);
    var delimitedColumns = this._grammar.delimit(quotedColumns);
    var delimitedTables = this._grammar.delimit(tables.map(quote));
    var fragments = [].concat(['SELECT '],
      delimitedColumns, [' FROM '], delimitedTables);

    joins.forEach(function(join) {
      fragments.push(' ', this.join(join));
    }, this);

    if (where) { fragments.push(' ', this.where(where)); }
    if (order.length) { fragments.push(' ', this.order(order)); }

    return Statement.create(this._grammar.join(fragments));
  },

  /**
   * Documentation forthcoming.
   */
  insert: function(data) {
    var table = data.table;
    var returning = data.returning;
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
      }).map(quoteValue);
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

    if (returning) {
      fragments.push(' RETURNING ', quoteField(returning));
    }

    return Statement.create(this._grammar.join(fragments));
  },

  /**
   * Documentation forthcoming.
   */
  update: function(data) {
    var table = data.table;
    var values = data.values;
    var where = data.where;
    var quoteField = this._grammar.field.bind(this._grammar);
    var quoteMixed = this._grammar.mixed.bind(this._grammar);
    var join = this._grammar.join.bind(this._grammar);
    var delimit = this._grammar.delimit.bind(this._grammar);

    var createAssignment = function(value, field) {
      return join([quoteField(field), ' = ', quoteMixed(value)]);
    };
    var assignments = delimit(_.map(values, createAssignment));
    var fragments = [].concat(['UPDATE '], [quoteField(table)],
      [' SET '], assignments);

    if (where) { fragments.push(' ', this.where(where)); }

    return Statement.create(this._grammar.join(fragments));
  },

  /**
   * Documentation forthcoming.
   */
  delete: function(data) {
    var table = data.table;
    var where = data.where;
    var quote = this._grammar.field.bind(this._grammar);
    var fragments = [].concat(['DELETE FROM '],
      quote(table));

    if (where) { fragments.push(' ', this.where(where)); }

    return Statement.create(this._grammar.join(fragments));
  },

  /**
   * Documentation forthcoming.
   */
  begin: function() {
    return Statement.create('BEGIN');
  },

  /**
   * Documentation forthcoming.
   */
  rollback: function() {
    return Statement.create('ROLLBACK');
  },

  /**
   * Documentation forthcoming.
   */
  commit: function() {
    return Statement.create('COMMIT');
  },

  /**
   * Documentation forthcoming.
   */
  createTable: function(data) {
    var options = data.options;
    var quoteField = this._grammar.field.bind(this._grammar);
    var columns = data.columns.map(this.createColumn, this);
    var delimitedColumns = this._grammar.delimit(columns);
    var joinedColumns = this._grammar.join(delimitedColumns);
    var groupedColumns = this._grammar.group(joinedColumns);
    var fragments = ['CREATE TABLE '];
    if (options.ifNotExists) {
      fragments.push('IF NOT EXISTS ');
    }
    fragments.push(quoteField(data.name), ' ');
    fragments = fragments.concat(groupedColumns);
    return Statement.create(this._grammar.join(fragments));
  },

  /**
   * Documentation forthcoming.
   */
  createColumn: function(column) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var escape = this._grammar.escape.bind(this._grammar);
    var join = this._grammar.join.bind(this._grammar);
    var type = this._translator.type(column.type, column.options);
    var fragments = [quoteField(column.name), ' ', type];
    if (column.options.primaryKey) {
      fragments.push(' PRIMARY KEY');
    }
    if (column.options.notNull) {
      fragments.push(' NOT NULL');
    }
    if (column.options.default !== undefined) {
      fragments.push(' DEFAULT ');
      fragments.push(escape(column.options.default));
    }
    if (column.options.unique) {
      fragments.push(' UNIQUE');
    }
    if (column.options.references) {
      fragments.push(' FOREIGN KEY ');
      fragments.push(quoteField(column.options.references));
    }
    return join(fragments);
  },

  /**
   * Documentation forthcoming.
   */
  dropTable: function(data) {
    var options = data.options;
    var quoteField = this._grammar.field.bind(this._grammar);
    var fragments = ['DROP TABLE '];
    if (options.ifExists) {
      fragments.push('IF EXISTS ');
    }
    fragments.push(quoteField(data.name));
    return Statement.create(this._grammar.join(fragments));
  }
});

module.exports = Phrasing.reopenClass({ __name__: 'Phrasing' });
