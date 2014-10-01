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
}, { __name__: 'Operation' });

/**
 * Unary operation.
 *
 * @private
 * @extends Operation
 * @constructor
 */
Operation.Unary = Operation.extend({}, { __name__: 'Operation.Unary' });

/**
 * Binary operation.
 *
 * @private
 * @extends Operation
 * @constructor
 */
Operation.Binary = Operation.extend({}, { __name__: 'Operation.Binary' });

module.exports = Operation;
