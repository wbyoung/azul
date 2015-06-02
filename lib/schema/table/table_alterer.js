'use strict';

var _ = require('lodash');
var TableCreator = require('./table_creator');
var property = require('corazon/property');

/**
 * A class that can create, drop & alter columns for tables.
 *
 * @protected
 * @constructor TableAlterer
 * @param {Array} columns An empty array that will be mutated to contain
 * {@link TableAlterer~Column} objects as they are created.
 */
var TableAlterer = TableCreator.extend();

TableAlterer.reopenClass({

  /**
   * A class that reverses can create, drop & alter columns for tables.
   *
   * @protected
   * @constructor
   * @extends TableAlterer
   */
  Reversible: TableAlterer.extend(),

  /**
   * A class that ensures reversible can create, drop & alter columns for tables.
   *
   * @protected
   * @constructor
   * @extends TableAlterer
   */
  Reverse: TableAlterer.extend(),

});

TableAlterer.reopen(/** @lends TableAlterer# */ {
  init: function(/*name*/) {
    this._super.apply(this, arguments);
    this._dropped = [];
    this._droppedIndexes = [];
    this._renamed = [];
    this._renamedIndexes = [];
  },

  /**
   * Alias for {@link TableCreator#columns}.
   *
   * @private
   * @scope internal
   * @type {Array.<Column>}
   * @readonly
   */
  added: property({ property: 'columns' }),

  /**
   * Alias for {@link TableCreator#indexes}.
   *
   * @private
   * @scope internal
   * @type {Array.<Index>}
   * @readonly
   */
  addedIndexes: property({ property: 'indexes' }),

  /**
   * Names of dropped columns.
   *
   * @private
   * @scope internal
   * @type {Array.<String>}
   * @readonly
   */
  dropped: property(),

  /**
   * Names of dropped indexes.
   *
   * @private
   * @scope internal
   * @type {Array.<String>}
   * @readonly
   */
  droppedIndexes: property(),

  /**
   * Details of renamed columns.
   *
   * @private
   * @scope internal
   * @type {Array.<Object>}
   * @readonly
   */
  renamed: property(),

  /**
   * Details of renamed indexes.
   *
   * @private
   * @scope internal
   * @type {Array.<Object>}
   * @readonly
   */
  renamedIndexes: property(),

  /**
   * Drop a column.
   *
   * @method
   * @public
   * @param {String} column The column name.
   */
  drop: function(column) {
    this._dropped.push(column);
  },

  /*
   * Drop an index.
   *
   * @method
   * @public
   * @param {String|Array.<String>} [columns] The columns for the index
   * @param {Object} [options]
   * @param {String} [options.name] The name of the index.
   */
  dropIndex: function(/*columns, options*/) {
    var args = _.toArray(arguments);
    var columns = _.isArray(args[0]) || _.isString(args[0]) ? args.shift() : [];
    var options = args.shift();
    this._droppedIndexes.push(this._indexName(columns, options));
  },

  /**
   * Rename a column.
   *
   * @method
   * @public
   * @param {String} from The old column name.
   * @param {String} to The new column name.
   * @param {String} type The column type. This should match the existing type
   * and may or may not be used by the backend.
   */
  rename: function(column, to, type) {
    this._renamed.push({ from: column, to: to, type: type });
  },

  /*
   * Rename an index.
   *
   * @method
   * @public
   * @param {String} from The old index name.
   * @param {String} to The new index name.
   */
  renameIndex: function(from, to) {
    this._renamedIndexes.push({ from: from, to: to });
  },

});

TableAlterer.Reversible.reopen(/** @lends TableAltererReversible# */ {

  /**
   * Drop a column.
   *
   * Not reversible.
   *
   * @method
   * @public
   * @param {String} column The column name.
   */
  drop: function(/*column*/) {
    throw new Error('Reversible migrations cannot drop columns.');
  },

  /**
   * Drop an index.
   *
   * Not reversible.
   *
   * @method
   * @public
   * @param {String} index The index name.
   */
  dropIndex: function(/*index*/) {
    throw new Error('Reversible migrations cannot drop indexes.');
  },

});

TableAlterer.Reverse.reopen(/** @lends TableAltererReverse# */ {

  /**
   * Reverse added columns.
   *
   * @private
   * @scope internal
   * @type {Array.<Column>}
   * @readonly
   */
  added: property(function() {
    return [];
  }),

  /**
   * Reverse added indexes.
   *
   * @private
   * @scope internal
   * @type {Array.<Index>}
   * @readonly
   */
  addedIndexes: property(function() {
    return [];
  }),

  /**
   * Reversed dropped columns.
   *
   * @private
   * @scope internal
   * @type {Array.<String>}
   * @readonly
   */
  dropped: property(function() {
    return this._columns.map(function(col) { return col.name; });
  }),

  /**
   * Reversed dropped indexes.
   *
   * @private
   * @scope internal
   * @type {Array.<String>}
   * @readonly
   */
  droppedIndexes: property(function() {
    return this._indexes.map(function(idx) { return idx.name; });
  }),

  /**
   * Drop a column.
   *
   * Not reversible.
   *
   * @method
   * @public
   * @param {String} column The column name.
   */
  drop: function(/*column*/) {
    throw new Error('Reverse migrations cannot drop columns.');
  },

  /**
   * Drop an index.
   *
   * Not reversible.
   *
   * @method
   * @public
   * @param {String} index The index name.
   */
  dropIndex: function(/*index*/) {
    throw new Error('Reverse migrations cannot drop indexes.');
  },

  /**
   * Reverse rename of a column.
   *
   * @method
   * @public
   * @see {@link TableAlterer#rename}
   */
  rename: function(column, to, type) {
    this._renamed.push({ from: to, to: column, type: type });
  },

  /**
   * Reverse rename of an index.
   *
   * @method
   * @public
   * @see {@link TableAlterer#renameIndex}
   */
  renameIndex: function(from, to) {
    this._renamedIndexes.push({ from: to, to: from });
  },

});

TableAlterer.Reversible.reopenClass({ __name__: 'TableAltererReversible' });
TableAlterer.Reverse.reopenClass({ __name__: 'TableAltererReverse' });
module.exports = TableAlterer.reopenClass({ __name__: 'TableAlterer' });
