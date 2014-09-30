'use strict';

var _ = require('lodash');
var Class = require('../../util/class');

/**
 * A tree node. This is really just a simple wrapper for an object that clearly
 * defines the type and allows for type checking.
 *
 * @private
 * @constructor
 * @param {Object} values The values for the node.
 */
var Node = Class.extend({
  init: function(values) {
    _.extend(this, values);
  }
});

module.exports = Node;
