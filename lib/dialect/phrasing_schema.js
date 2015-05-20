'use strict';

var util = require('util');
var Mixin = require('../util/mixin');
var Statement = require('../types/statement');

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
   * @param {Array.<Index>} data.indexes
   * @param {Object} data.options
   * @param {Boolean} data.options.ifNotExists
   * @return {Statement} The statement.
   * @see {@link Phrasing#columnFragment}
   */
  createTable: function(data) {
    var options = data.options;
    var quoteField = this._grammar.field.bind(this._grammar);
    var group = this._grammar.group.bind(this._grammar);
    var delimit = this._grammar.delimit.bind(this._grammar);
    var join = this._grammar.join.bind(this._grammar);

    var columns = data.columns.map(this.columnFragment, this);
    var indexes = data.indexes.map(this.indexFragment, this);
    var spec = group(join(delimit([].concat(columns, indexes))));

    var fragments = ['CREATE TABLE '];
    if (options.ifNotExists) {
      fragments.push('IF NOT EXISTS ');
    }
    fragments.push(quoteField(data.name), ' ');
    fragments = fragments.concat(spec);
    return Statement.create(join(fragments));
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
  columnFragment: function(column) {
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
    if (column.options.references && this.foreignKeyFragment(column)) {
      fragments.push(' ', this.foreignKeyFragment(column));
    }
    return join(fragments);
  },

  /**
   * Index fragment.
   *
   * @method
   * @public
   * @param {Index} index
   * @return {Fragment} The fragment.
   */
  indexFragment: function(index) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var delimit = this._grammar.delimit.bind(this._grammar);
    var fragments = ['INDEX ', quoteField(index.name)];
    fragments.push(' (');
    fragments = fragments.concat(delimit(index.columns.map(quoteField)));
    fragments.push(')');
    return this._grammar.join(fragments);
  },

  /**
   * Foreign key fragment.
   *
   * @method
   * @public
   * @param {Object} column
   * @return {Fragment} The fragment.
   */
  foreignKeyFragment: function(column) {
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
   * @param {Array.<Index>} data.addedIndexes
   * @param {Array.<String>} data.dropped
   * @param {Array.<Object>} data.renamed
   * @return {Statement} The statement.
   */
  alterTable: function(data) {
    var statement;
    var alterations =
      data.added.length +
      data.addedIndexes.length +
      data.dropped.length +
      data.renamed.length;
    if (alterations === 1 && data.addedIndexes.length === 1) {
      statement = this.createIndex(data.name, data.addedIndexes[0]);
    }
    else if (alterations) {
      var quoteField = this._grammar.field.bind(this._grammar);
      var delimit = this._grammar.delimit.bind(this._grammar);
      var join = this._grammar.join.bind(this._grammar);

      var added = data.added.map(this.addColumnFragment, this);
      var dropped = data.dropped.map(this.dropColumnFragment, this);
      var renamed = data.renamed.map(this.renameColumnFragment, this);
      var indexes = data.addedIndexes.map(this.addIndexFragment, this);
      var spec = join(delimit([].concat(dropped, added, renamed, indexes)));

      var fragments = ['ALTER TABLE '];
      fragments.push(quoteField(data.name), ' ');
      fragments = fragments.concat(spec);
      statement = Statement.create(join(fragments));
    }
    return statement;
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
   * @see {@link Phrasing#columnFragment}
   */
  addColumnFragment: function(column) {
    return this._grammar.join(['ADD COLUMN ', this.columnFragment(column)]);
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
  dropColumnFragment: function(column) {
    return this._grammar.join(['DROP COLUMN ', this._grammar.field(column)]);
  },

  /**
   * Rename column fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {Object} column
   * @param {String} column.from
   * @param {String} column.to
   * @param {String} column.type
   * @return {Fragment} The fragment.
   */
  renameColumnFragment: function(column) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var fragments = ['RENAME ',
      quoteField(column.from), ' TO ',
      quoteField(column.to),
    ];
    return this._grammar.join(fragments);
  },

  /**
   * Add index fragment.
   *
   * Subclasses should override to customize this fragment.
   *
   * @method
   * @public
   * @param {Index} index
   * @return {Fragment} The fragment.
   * @see {@link Phrasing#indexFragment}
   */
  addIndexFragment: function(index) {
    return this._grammar.join(['ADD ', this.indexFragment(index)]);
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
  },

  /**
   * Create index statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {String} table
   * @param {Index} index
   * @return {Statement} The statement.
   */
  createIndex: function(table, index) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var delimit = this._grammar.delimit.bind(this._grammar);
    var fragments = [
      'CREATE INDEX ', quoteField(index.name),
      ' ON ', quoteField(table)
    ];
    fragments.push(' (');
    fragments = fragments.concat(delimit(index.columns.map(quoteField)));
    fragments.push(')');

    return Statement.create(this._grammar.join(fragments));
  },

});
