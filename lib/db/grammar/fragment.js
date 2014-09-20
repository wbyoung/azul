'use strict';

/**
 * @constructor
 * @private
 * @param {String} string The fragment's string.
 * @param {Array} args The arguments carried with this fragment.
 */
function Fragment(string, args) {
  this._string = string;
  this.arguments = args || [];
}

Fragment.prototype.toString = function() {
  return this._string;
};

module.exports = Fragment;