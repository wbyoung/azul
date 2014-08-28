'use strict';

var util = require('util');
var Grammar = require('../grammar');

/**
 * The base Adapter class is the extension point for custom database adapters.
 * As a user of Agave, you typically won't use this, but if you're looking to
 * add support for a custom database, you should start here.
 *
 * @since 1.0
 * @public
 * @constructor
 */
function Adapter() {
  this._grammar = new this.constructor.Grammar();
}

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @type {Grammar}
 */
Adapter.Grammar = Grammar;

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Adapter.prototype.conditionSQLFragment = function(condition) {
  var args = [];
  var op = function(type) { return type; };
  var result = condition.build(this._grammar, null, op);

  return {
    sql: result.string,
    arguments: result.extraction
  };
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Adapter.prototype.whereSQLFragment = function(condition) {
  var result = this.conditionSQLFragment(condition);
  result.sql = 'where ' + result.sql;
  return result;
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Adapter.prototype.joinSQLFragment = function(join) {
  var type = join.type;
  var table = join.table;

  var result = {};
  result.sql = type + ' join ' + table;
  result.arguments = [];

  if (join.condition) {
    var condition = this.conditionSQLFragment(join.condition);
    result.sql += ' on ' + condition.sql;
    result.arguments = result.arguments.concat(condition.arguments);
  }

  return result;
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Adapter.prototype.quoteField = function(name) {
  var components = name.split('.');
  var quotedComponents = components.map(function(part) {
    return '"' + part + '"';
  });
  return quotedComponents.join('.');
};

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
 */
Adapter.prototype.selectSQL = function(data) {
  var tables = data.tables;
  var columns = data.columns;
  var joins = data.joins;
  var where = data.where;
  var quote = this.quoteField.bind(this);
  var quotedColumns = columns === '*' ? [columns] : columns.map(quote);
  var result = {
    sql: util.format('select %s from %s', quotedColumns.join(', '), tables.join(', ')),
    arguments: []
  };
  if (where) {
    var fragment = this.whereSQLFragment(where);
    result.sql += ' ' + fragment.sql;
    result.arguments = result.arguments.concat(fragment.arguments);
  }
  joins.forEach(function(join) {
    var fragment = this.joinSQLFragment(join);
    result.sql += ' ' + fragment.sql;
    result.arguments = result.arguments.concat(fragment.arguments);
  }, this);
  return result;
};


module.exports = Adapter;
