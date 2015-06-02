'use strict';

var _ = require('lodash');
var Class = require('corazon/class');

/**
 * A literal-safe string. This is used to indicate that a value can be used
 * directly in a query without any escaping. That is, it's neither a positional
 * argument nor a field. In general, this is used via a shorthand notation of a
 * function named `l`.
 *
 * This exists for internal use only and should not be used as there should
 * always be another way to create appropriate queries without using literals.
 * Literals could lead to SQL injection vulnerabilities.
 *
 * For instance:
 *
 *     select('users').where({ firstName: 'Whitney' }) // -> select * from users where firstName = ?, 'Whitney'
 *     select('users').where({ firstName: l('"Whitney"') }) // -> select * from users where firstName = "Whitney"
 *
 * @constructor Condition.LiteralString
 * @private
 * @param {String} string The string to mark as literal-safe.
 */

/**
 * Alias for {@link Condition.LiteralString}.
 *
 * @constant {Condition.LiteralString} Condition.l
 * @see {@link Condition.LiteralString}
 */
var LiteralString = Class.extend(/** @lends LiteralString# */ {
  init: function(string) {
    this._super();
    this.string = string;
  },

  /**
   * Converts to a native string. This is provided to ensure that the string will
   * appear naturally when used via many output options.
   *
   * @return {String} The string
   */
  toString: function() {
    return '' + this.string;
  }
});

LiteralString.reopenClass(/** @lends LiteralString */ {
  l: _.extend(LiteralString.create.bind(LiteralString), LiteralString)
});

module.exports = LiteralString.reopenClass({ __name__: 'LiteralString' });
