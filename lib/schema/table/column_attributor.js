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
   * Alias of {@link ColumnAttributor#primaryKey}.
   *
   * @method
   * @public
   * @see {@link ColumnAttributor#primaryKey}
   */
  pk: opt('primaryKey'),

  /**
   * Mark this column as being a primary key column.
   *
   * @method
   * @public
   */
  primaryKey: opt('primaryKey'),

  /**
   * Mark this column as not accepting null values.
   *
   * @method
   * @public
   */
  notNull: opt('notNull'),

  /**
   * Mark this column as containing unique values.
   *
   * @method
   * @public
   */
  unique: opt('unique'),

  /**
   * Set the default value for this column.
   *
   * Note that this value will be escaped before being handed off to the
   * database. Because of this, we recommend against sending user-input to this
   * method.
   *
   * @method
   * @public
   * @param {String|Number} value The value for the default.
   */
  default: opt('default', true),

  /**
   * Set the column that this column references.
   *
   * @method
   * @public
   * @param {String} reference The table & column that this column references.
   * For instance, `user.id`.
   */
  references: opt('references', true)
});

module.exports = ColumnAttributor.reopenClass({
  __name__: 'Table~ColumnAttributor'
});
