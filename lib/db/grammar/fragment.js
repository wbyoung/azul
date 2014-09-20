'use strict';

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
function Fragment(value, args) {
  this.value = value;
  this.arguments = args || [];
}

/**
 * Convert to string and/or access the string portion of the fragment. This is
 * also accessible via the `value` property, but the preferred way of accessing
 * it is to convert it to a string.
 *
 * @return {String} The string value of the fragment.
 */
Fragment.prototype.toString = function() {
  return this.value;
};

module.exports = Fragment;
