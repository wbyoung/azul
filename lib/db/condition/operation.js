'use strict';

/**
 * The base operation class.
 *
 * @private
 * @constructor
 * @param {String} name The operation name/symbol.
 */
function Operation(name) { this.name = name; }

/**
 * Unary operation.
 *
 * @private
 * @extends Operation
 * @constructor
 */
Operation.Unary = function() { Operation.apply(this, arguments); }
Operation.Unary.prototype = Object.create(Operation.prototype);

/**
 * Binary operation.
 *
 * @private
 * @extends Operation
 * @constructor
 */
Operation.Binary = function() { Operation.apply(this, arguments); }
Operation.Binary.prototype = Object.create(Operation.prototype);

module.exports = Operation;
