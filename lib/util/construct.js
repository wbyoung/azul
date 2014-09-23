'use strict';

/**
 * Helper function for instance construction.
 *
 * @private
 * @function
 * @param {Object} cls The class of the object to construct.
 * @param {Array} args The original arguments passed to the constructor.
 * @return {Object} The constructed object.
 */
module.exports = function(cls, args) {
  var F = function() { return cls.apply(this, args); };
  F.prototype = cls.prototype;
  return new F();
};
