'use strict';

var Class = require('../../util/class');

/**
 * A fragment represents part of a statement/expression that will eventually be
 * handed off to the database. It carries with it arguments so that each
 * fragment can be joined with others while still respecting argument position.
 *
 * @constructor
 * @private
 * @param {String} value The fragment's string value.
 * @param {Array} args The arguments carried with this fragment.
 */
var Fragment = Class.extend({
  init: function(value, args) {
    this._value = value;
    this._arguments = args || [];

    if (arguments.length == 1 && value instanceof Fragment) {
      var fragment = value;
      this._value = fragment._value;
      this._arguments = fragment._arguments;
    }
  }
});

/**
 * Convert to string and/or access the string portion of the fragment. This is
 * also accessible via the {@link Fragment#value} property, but the preferred
 * way of accessing it is to convert it to a string.
 *
 * @return {String} The string value of the fragment.
 */
Fragment.prototype.toString = function() {
  return this.value;
};

/**
 * The SQL string.
 *
 * @name Fragment#value
 * @since 1.0
 * @public
 * @type {String}
 * @readonly
 */
Fragment.defineAccessor('value');

/**
 * An alias for {@link Fragment#value}.
 *
 * @name Fragment#sql
 * @since 1.0
 * @public
 * @type {String}
 * @readonly
 */
Fragment.defineAccessor('sql', { property: '_value' });

/**
 * The arguments.
 *
 * @name Fragment#arguments
 * @since 1.0
 * @public
 * @type {Array}
 * @readonly
 */
Fragment.defineAccessor('arguments');

module.exports = Fragment;
