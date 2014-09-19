'use strict';

var _ = require('lodash');

/**
 * A tree node. This is really just a simple wrapper for an object that clearly
 * defines the type and allows for type checking.
 *
 * @since 1.0
 * @private
 * @constructor
 * @param {Object} values The values for the node.
 */
function Node(values) {
  _.extend(this, values);
};

module.exports = Node;
