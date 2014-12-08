'use strict';

var Class = require('../../util/class');

/**
 * Helper method for creating a chainable method that alters column options.
 *
 * @private
 * @function ColumnAttributor~opt
 * @param {String} name The name of the option to set.
 * @param {Boolean} arg Whether or not the option accepts an argument. If so,
 * the value will be stored as the column's option value. If not, it will
 * simply be flagged as enabled (set to a value of `true`).
 */
var opt = function(name, arg) {
  return function() {
    this._column.options[name] = arg ? arguments[0] : true;
    return this;
  };
};

/**
 * An object that can update column options via chainable methods.
 *
 * @protected
 * @constructor ColumnAttributor
 * @param {ColumnCreator~Column} column The column on which to alter options.
 */
var ColumnAttributor = Class.extend(/** @lends ColumnAttributor# */ {
  init: function(column) {
    this._column = column;
  },

  /**
   * Documentation forthcoming.
   */
  pk: opt('primaryKey'),

  /**
   * Documentation forthcoming.
   */
  primaryKey: opt('primaryKey'),

  /**
   * Documentation forthcoming.
   */
  notNull: opt('notNull'),

  /**
   * Documentation forthcoming.
   */
  unique: opt('unique'),

  /**
   * Documentation forthcoming.
   */
  default: opt('default', true),

  /**
   * Documentation forthcoming.
   */
  references: opt('references', true)
});

module.exports = ColumnAttributor.reopenClass({
  __name__: 'Table~ColumnAttributor'
});
