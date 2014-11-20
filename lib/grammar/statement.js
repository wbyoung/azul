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
var Statement = Fragment.extend();

module.exports = Statement.reopenClass({ __name__: 'Statement' });
