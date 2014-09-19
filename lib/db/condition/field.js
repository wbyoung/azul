'use strict';

var construct = require('../../util/construct');

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
 * @alias Condition.f
 * @param {String} string The string to mark as field-safe.
 */
function FieldString(string) {
  if (!(this instanceof FieldString)) { return construct(FieldString, arguments); }

  this.string = string;
}

/**
 * Converts to a native string. This is provided to ensure that the string will
 * appear naturally when used via many output options.
 *
 * @return {String} The string
 */
FieldString.prototype.toString = function() {
  return "" + this.string;
};

module.exports = FieldString;
