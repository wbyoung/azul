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
    if (column.options.references && this.foreignKey(column)) {
      fragments.push(' ', this.foreignKey(column));
    }
    return join(fragments);
  },

  /**
   * Foreign key fragment.
   *
   * @method
   * @public
   * @param {Object} column
   * @return {Fragment} The fragment.
   */
  foreignKey: function(column) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var reference = column.options.references;
    var parts = reference.split('.');
    var fragments = ['REFERENCES '];

    if (parts.length === 1) { parts.unshift(column.table); }
    if (parts.length === 2) {
      fragments.push(quoteField(parts[0]), ' (', quoteField(parts[1]), ')');
    }
    else {
      throw new Error(util.format('Invalid reference format %j', reference));
    }
    return this._grammar.join(fragments);
  },

  /**
   * Alter table statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {Object} data
   * @param {String} data.name
   * @param {Array.<Column>} data.added
   * @param {Array.<String>} data.dropped
   * @return {Statement} The statement.
   */
  alterTable: function(data) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var added = data.added.map(this.addColumn, this);
    var dropped = data.dropped.map(this.dropColumn, this);
    var delimited = this._grammar.delimit([].concat(dropped, added));
    var joined = this._grammar.join(delimited);
    var fragments = ['ALTER TABLE '];
    fragments.push(quoteField(data.name), ' ');
    fragments = fragments.concat(joined);
    return Statement.create(this._grammar.join(fragments));
  },

  /**
   * Add column fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {Object} column
   * @return {Fragment} The fragment.
   * @see {@link Phrasing#createColumn}
   */
  addColumn: function(column) {
    return this._grammar.join(['ADD COLUMN ', this.createColumn(column)]);
  },

  /**
   * Drop column fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {String} column
   * @return {Fragment} The fragment.
   */
  dropColumn: function(column) {
    return this._grammar.join(['DROP COLUMN ', this._grammar.field(column)]);
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
