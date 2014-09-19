'use strict';

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
  Object.keys(values).forEach(function(key) {
    this[key] = values[key];
  }, this);
};

module.exports = Node;