'use strict';

var construct = function(cls, args) {
  var F = function() { return cls.apply(this, args); }
  F.prototype = cls.prototype;
  return new F();
};

/**
 * TODO: document
 */
function Condition() {
  if (!(this instanceof Condition)) { return construct(Condition, arguments); }

  // check for simple wrapping of condition
  if (arguments.length === 1 && arguments[0] instanceof Condition) {
    return arguments[0];
  }

  this._parts = [];
  this._initialize(Array.prototype.slice.call(arguments));
}

Condition.or = {};
Condition.and = {};
Condition.not = {};

Condition.prototype._initialize = function(parts) {
  parts.forEach(function(part) {
    if (part) {
      this._parts.push(part); // TODO: how to handle sub-conditions properly
    }
  }, this);
};

/**
 * TODO: document
 */
Condition.prototype.each = function(cb) {
  // TODO: how to handle sub-conditions properly & how to build up proper nested logic into a full expression
  this._parts.forEach(function(part) {
    Object.keys(part).forEach(function(key) {
      cb(key, part[key], '=');
    });
  });
};

module.exports = Condition;
