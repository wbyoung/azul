'use strict';

/**
 * A function to decorate the context in which this method is operating for
 * relation lookups to enhance error messages.
 *
 * @function BoundQuery~decorateRelationContext
 * @param {String} name The context name.
 * @param {Function} fn The original function.
 * @return {Function} The decorated function.
 */
module.exports.decorateRelationContext = function(name, fn) {
  return function() {
    this._relationCallContext = name;
    var result = fn.apply(this, arguments);
    this._relationCallContext = undefined;
    return result;
  };
};
