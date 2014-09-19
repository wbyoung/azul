'use strict';

function Operation(name) { this.name = name; }

Operation.Unary = function() { Operation.apply(this, arguments); }
Operation.Unary.prototype = Object.create(Operation.prototype);

Operation.Binary = function() { Operation.apply(this, arguments); }
Operation.Binary.prototype = Object.create(Operation.prototype);

module.exports = Operation;
