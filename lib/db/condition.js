'use strict';

var construct = function(cls, args) {
  var F = function() { return cls.apply(this, args); }
  F.prototype = cls.prototype;
  return new F();
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @class Condition
 * @constructor
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
    if (Array.isArray(part)) {
      this._parts.push(construct(Condition, part));
    }
    else {
      this._parts.push(part);
    }
  }, this);
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method build
 */
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
      if (needOperation) {
        fragments.push(operation('and'));
      }
      fragments.push('(' + part.build(expression, operation) + ')');
      needOperation = true;
    }
    else {
      Object.keys(part).forEach(function(key) {
        if (needOperation) {
          fragments.push(operation('and'));
        }
        var details = Condition._predicate(key);
        var value = part[key];
        fragments.push(expression(details.key, value, details.predicate));
        needOperation = true;
      });
    }
  });
  return fragments.join(' ');
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @protected
 * @method _predicate
 */
Condition._predicate = function(keypred) {
  var details = {};
  var match = keypred.match(/(\w+)\[(\w+)\]/);
  if (match) {
    details.key = match[1];
    details.predicate = match[2];
  }
  else {
    details.key = keypred;
    details.predicate = 'exact';
  }
  return details;
};

module.exports = Condition;
