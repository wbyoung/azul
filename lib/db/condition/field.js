'use strict';

var Class = require('../../util/class');

/**
 * A field-safe string. This is used to indicate that a value should not be
 * sent to the database as data (a positional argument). In general, this is
 * used via a shorthand notation of a function named `f`.
 *
 * For instance:
 *
 *     select('users').where({ firstName: 'lastName' }) // -> select * from users where firstName = ?, 'lastName'
 *     select('users').where({ firstName: f('lastName') }) // -> select * from users where firstName = lastName
 *
 * @constructor Condition.FieldString
 * @param {String} string The string to mark as field-safe.
 */

/**
 * Alias for {@link Condition.FieldString}.
 *
 * @constant {Class} Condition.f
 * @see {@link Condition.FieldString}
 */
var FieldString = Class.extend({
  init: function(string) {
    this.string = string;
  }
});

/**
 * Converts to a native string. This is provided to ensure that the string will
 * appear naturally when used via many output options.
 *
 * @return {String} The string
 */
FieldString.prototype.toString = function() {
  return '' + this.string;
};

module.exports = FieldString;
