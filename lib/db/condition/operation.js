'use strict';

var Class = require('../../util/class');

/**
 * The base operation class.
 *
 * @private
 * @constructor
 * @param {String} name The operation name/symbol.
 */
var Operation = Class.extend({
  init: function(name) { this.name = name; }
});

/**
 * Unary operation.
 *
 * @private
 * @extends Operation
 * @constructor
 */
Operation.Unary = Operation.extend();

/**
 * Binary operation.
 *
 * @private
 * @extends Operation
 * @constructor
 */
Operation.Binary = Operation.extend();

module.exports = Operation;
