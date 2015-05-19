'use strict';

var ColumnCreator = require('./column_creator');
var property = require('../../util/property').fn;

/**
 * A class that can create, drop & alter columns for tables.
 *
 * @protected
 * @constructor ColumnAlterer
 * @param {Array} columns An empty array that will be mutated to contain
 * {@link ColumnAlterer~Column} objects as they are created.
 */
var ColumnAlterer = ColumnCreator.extend({
  init: function(/*name*/) {
    this._super.apply(this, arguments);
    this._renamed = [];
    this._dropped = [];
  },

  /**
   * Alias for {@link ColumnCreator#columns}.
   *
   * @private
   * @scope internal
   * @type {Array.<Column>}
   * @readonly
   */
  added: property({ property: 'columns' }),

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

module.exports = ColumnAlterer.reopenClass({
  __name__: 'Table~ColumnAlterer'
});
