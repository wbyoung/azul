'use strict';

/**
 * Node tree.
 *
 * Documentation forthcoming.
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