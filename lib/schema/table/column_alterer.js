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
  init: function() {
    this._super.apply(this, arguments);
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
   * Drop a column.
   *
   * @method
   * @public
   * @param {String} column The column name.
   */
  drop: function(column) {
    this._dropped.push(column);
  }

});

module.exports = ColumnAlterer.reopenClass({
  __name__: 'Table~ColumnAlterer'
});
