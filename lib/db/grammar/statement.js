'use strict';

var Fragment = require('./fragment');

/**
 * A fully formed statement. Basically just a fragment, but now is considered
 * to be complete.
 *
 * @constructor
 * @private
 * @extends Fragment
 */
function Statement() {
  Fragment.apply(this, arguments);
}

Statement.prototype = Object.create(Fragment.prototype);
Statement.prototype.constructor = Statement;

module.exports = Statement;
