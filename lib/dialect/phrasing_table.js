'use strict';

var util = require('util');
var Mixin = require('corazon/mixin');
var Statement = require('../types/statement');

/**
 * Phrasing mixin for create/alter/drop/rename table statements & related
 * fragments.
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
   * @param {Array.<String>} data.droppedIndexes
   * @param {Array.<Object>} data.renamed
   * @param {Array.<Object>} data.renamedIndexes
   * @return {Statement} The statement.
   */
  alterTable: function(data) {
    var statement;
    var alterations =
      data.added.length +
      data.addedIndexes.length +
      data.dropped.length +
      data.droppedIndexes.length +
      data.renamed.length +
      data.renamedIndexes.length;
    if (alterations === 1 && data.addedIndexes.length === 1) {
      statement = this.createIndex(data.name, data.addedIndexes[0]);
    }
    else if (alterations === 1 && data.droppedIndexes.length === 1) {
      statement = this.dropIndex(data.name, data.droppedIndexes[0]);
    }
    else if (alterations === 1 && data.renamedIndexes.length === 1) {
      statement = this.renameIndex(data.name, data.renamedIndexes[0]);
    }
    else if (alterations) {
      var quoteField = this._grammar.field.bind(this._grammar);
      var delimit = this._grammar.delimit.bind(this._grammar);
      var join = this._grammar.join.bind(this._grammar);

      var spec = join(delimit([].concat(
        data.dropped.map(this.dropColumnFragment, this),
        data.added.map(this.addColumnFragment, this),
        data.renamed.map(this.renameColumnFragment, this),
        data.droppedIndexes.map(this.dropIndexFragment, this),
        data.addedIndexes.map(this.addIndexFragment, this),
        data.renamedIndexes.map(this.renameIndexFragment, this))));

      var fragments = ['ALTER TABLE '];
      fragments.push(quoteField(data.name), ' ');
      fragments = fragments.concat(spec);
      statement = Statement.create(join(fragments));
    }
    return statement;
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
   * Rename table statement.
   *
   * Subclasses should override to customize this query.
   *
   * @method
   * @public
   * @param {Object} data
   * @param {String} data.from
   * @param {String} data.to
   * @return {Statement} The statement.
   */
  renameTable: function(data) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var fragments = ['ALTER TABLE ',
      quoteField(data.from), ' RENAME TO ', quoteField(data.to)];
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
   * Foreign key fragment.
   *
   * @method
   * @public
   * @param {Object} column
   * @return {Fragment} The fragment.
   */
  foreignKeyFragment: function(column) {
    var quoteField = this._grammar.field.bind(this._grammar);
    var action = this.foreignKeyActionFragment.bind(this);
    var reference = column.options.references;
    var parts = reference.split('.');
    var fragments = ['REFERENCES '];

    if (parts.length === 1) { parts.unshift(column.table); }
    if (parts.length === 2) {
      fragments.push(quoteField(parts[0]), ' (', quoteField(parts[1]), ')');
      if (column.options.onDelete) {
        fragments.push(' ON DELETE ', action(column.options.onDelete));
      }
      if (column.options.onUpdate) {
        fragments.push(' ON UPDATE ', action(column.options.onUpdate));
      }
    }
    else {
      throw new Error(util.format('Invalid reference format %j', reference));
    }
    return this._grammar.join(fragments);
  },

  /**
   * Foreign key action fragment.
   *
   * @method
   * @public
   * @param {String} action
   * @return {Fragment|String} The fragment or string.
   */
  foreignKeyActionFragment: function(action) {
    var result = action.toUpperCase();
    if (result === 'NULLIFY') { result = 'SET NULL'; }
    else if (result === 'CASCADE' || result === 'RESTRICT') { }
    else {
      throw new Error('Unknown foreign key action "' + action + '"');
    }
    return result;
  },

});
