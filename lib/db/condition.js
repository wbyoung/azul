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

function Operation() {}
function OR() {} OR.prototype = Object.create(Operation.prototype);
function AND() {} AND.prototype = Object.create(Operation.prototype);
function NOT() {}; NOT.prototype = Object.create(Operation.prototype);

Condition.or = Condition.OR = OR;
Condition.and = Condition.AND = AND;
Condition.not = Condition.NOT = NOT;

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

Condition.prototype.build = function(expression, operation) {
  var fragments = [];
  var needOperation = false;
  this._parts.forEach(function(part) {
    if (part === AND) {
      fragments.push(operation('and'));
      needOperation = false;
    }
    else if (part === OR) {
      fragments.push(operation('or'));
      needOperation = false;
    }
    else if (part === NOT) {
      fragments.push(operation('not'));
      needOperation = false;
    }
    else if (part instanceof Condition) {
      fragments.push('(' + part.build(expression, operation) + ')');
    }
    else {
      Object.keys(part).forEach(function(key) {
        if (needOperation) {
          fragments.push(operation('and'));
        }
        var details = Condition._operation(key);
        var value = part[key];
        fragments.push(expression(details.key, value, details.operation));
        needOperation = true;
      });
    }
  });
  return fragments.join(' ');
};

/**
 * TODO: document
 */
Condition._operation = function(keyop) {
  var details = {};
  var match = keyop.match(/(\w+)\[(\w+)\]/);
  if (match) {
    details.key = match[1];
    details.operation = match[2];
  }
  else {
    details.key = keyop;
    details.operation = 'exact';
  }
  return details;
};

module.exports = Condition;
