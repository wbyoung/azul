'use strict';

var Class = require('../../../util/class');

/**
 * Documentation forthcoming.
 *
 * @private
 * @function ColumnAttributor~opt
 */
var opt = function(name, arg) {
  return function() {
    this._column.options[name] = arg ? arguments[0] : true;
  };
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @protected
 * @constructor ColumnAttributor
 */
var ColumnAttributor = Class.extend(/** @lends ColumnAttributor# */{
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
