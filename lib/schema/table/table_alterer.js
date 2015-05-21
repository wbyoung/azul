'use strict';

var TableCreator = require('./table_creator');
var property = require('../../util/property').fn;

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
    this._renamed = [];
    this._dropped = [];
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
   * Names of renamed columns.
   *
   * @private
   * @scope internal
   * @type {Array.<String>}
   * @readonly
   */
  renamed: property(),

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

});

TableAlterer.Reversible.reopen(/** @lends TableAltererReversible# */ {

  /**
   * Drop a column.
   *
   * @method
   * @public
   * @param {String} column The column name.
   */
  drop: function(/*column*/) {
    throw new Error('Reversible migrations cannot drop columns.');
  },

});

TableAlterer.Reverse.reopen(/** @lends TableAltererReverse# */ {

  /**
   * Alias for {@link TableCreator#columns}.
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
   * Alias for {@link TableCreator#indexes}.
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
   * Names of dropped columns.
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
   * Drop a column.
   *
   * @method
   * @public
   * @param {String} column The column name.
   */
  drop: function(/*column*/) {
    throw new Error('Reverse migrations cannot drop columns.');
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

});

TableAlterer.Reversible.reopenClass({ __name__: 'TableAltererReversible' });
TableAlterer.Reverse.reopenClass({ __name__: 'TableAltererReverse' });
module.exports = TableAlterer.reopenClass({ __name__: 'TableAlterer' });
