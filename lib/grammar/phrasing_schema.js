'use strict';

var util = require('util');
var Mixin = require('../util/mixin');
var Statement = require('./statement');

/**
 * Phrasing mixin for schema related phrases.
 *
 * This mixin separates some of the logic of {@link Phrasing} and is only
 * intended to be mixed into that one class.
 */
module.exports = Mixin.create(/** @lends Phrasing# */ {

  /**
   * Create table statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {Object} data
   * @param {String} data.name
   * @param {Array} data.columns
   * @param {Object} data.options
   * @param {Boolean} data.options.ifNotExists
   * @return {Statement} The statement.
   * @see {@link Phrasing#createColumn}
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
   * Create column fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {Object} column
   * @param {String} column.name
   * @param {String} column.type
   * @param {Object} column.options
   * @param {Boolean} column.options.primaryKey
   * @param {Boolean} column.options.notNull
   * @param {Boolean} column.options.unique
   * @param {String} column.options.default
   * @param {String} column.options.references
   * @return {Fragment} The fragment.
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
      fragments.push(' ', this.foreignKey(column.options.references));
    }
    return join(fragments);
  },

  /**
   * Foreign key fragment.
   *
   * @method
   * @public
   * @param {String} reference The field being referenced.
   * @return {Fragment} The fragment.
   */
  foreignKey: function(reference) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var parts = reference.split('.');
    var fragments = ['REFERENCES '];
    if (parts.length === 1) {
      fragments.push(quoteField(parts[0]));
    }
    else if (parts.length === 2) {
      fragments.push(quoteField(parts[0]), ' (', quoteField(parts[1]), ')');
    }
    else {
      throw new Error(util.format('Invalid reference format %j', reference));
    }
    return this._grammar.join(fragments);
  },

  /**
   * Drop table statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {Object} data
   * @param {String} data.name
   * @param {Object} data.options
   * @param {Boolean} data.options.ifExists
   * @return {Statement} The statement.
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
