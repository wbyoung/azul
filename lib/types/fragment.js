'use strict';

var Class = require('corazon/class');
var property = require('corazon/property');

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
var Fragment = Class.extend(/** @lends Fragment# */ {
  init: function(value, args) {
    this._super();
    this._value = value;
    this._args = args || [];

    if (arguments.length === 1 && value instanceof Fragment.__class__) {
      var fragment = value;
      this._value = fragment._value;
      this._args = fragment._args;
    }
  },

  /**
   * Convert to string and/or access the string portion of the fragment. This is
   * also accessible via the {@link Fragment#value} property, but the preferred
   * way of accessing it is to convert it to a string.
   *
   * @return {String} The string value of the fragment.
   */
  toString: function() {
    return this.value;
  }
});

/**
 * The SQL string.
 *
 * @name Fragment#value
 * @public
 * @type {String}
 * @readonly
 */
Fragment.reopen({ value: property() });

/**
 * An alias for {@link Fragment#value}.
 *
 * @name Fragment#sql
 * @public
 * @type {String}
 * @readonly
 */
Fragment.reopen({ sql: property({ property: '_value' }) });

/**
 * The arguments.
 *
 * @name Fragment#args
 * @public
 * @type {Array}
 * @readonly
 */
Fragment.reopen({ args: property() });

Fragment.reopenClass({ __name__: 'Fragment' });
module.exports = Fragment;
