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
 * @method
 */
Condition.prototype.build = function(grammar, ignore, operation) {
  var expression = null;
  var extractions = [];
  var operation = 'and';

  this._parts.forEach(function(part) {
    if (part === AND) { operation = 'and'; }
    else if (part === OR) { operation = 'or'; }
    else if (part === NOT) { operation = 'not'; } // TODO: not is specail, test it better
    else if (part instanceof Condition) {
      var sub = part.build(grammar, null, operation);
      var subDetails = grammar.group(sub.string);

      expression = expression ?
          grammar.operation(expression, operation, subDetails.string).string :
          subDetails.string;
      extractions = extractions.concat(sub.extraction);

      // TODO: figure out which extraction to use
    }
    else {
      Object.keys(part).forEach(function(key) {
        var details = Condition._predicate(key);

        var lhs = details.key;
        var rhs = part[key];

        var lhsDetails = grammar.field(lhs);
        var rhsDetails = rhs instanceof FieldString ?
          grammar.field(rhs.toString()) : grammar.value(rhs);

        if (lhsDetails.extraction) { extractions.push(lhsDetails.extraction); }
        if (rhsDetails.extraction) { extractions.push(rhsDetails.extraction); }

        // TODO: figure out how to handle extractions from lhs, rhs, and expression
        // in a more logical manner. it should support somehow changing orderings.
        var thisone = grammar.expression(lhsDetails.string, details.predicate, rhsDetails.string);

        expression = expression ?
          grammar.operation(expression, operation, thisone.string).string :
          thisone.string;
        // TODO: it might make more sense to have extractions come from the final, built
        // expression.

        operation = 'and';
      });
    }
  });
  return {
    string: expression,//fragments.join(' '),
    extraction: extractions
  };
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @protected
 * @method
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

/**
 * A field-safe string. This is used to indicate that a value should not be
 * sent to the database as data (a positional argument). In general, this is
 * used via a shorthand notation of a function named `f`.
 *
 * For instance:
 *
 *     select('users').where({ firstName: 'lastName' }) // -> select * from users where firstName = ?, 'lastName'
 *     select('users').where({ firstName: f('lastName') }) // -> select * from users where firstName = lastName
 *
 * @constructor Condition.FieldString
 * @param {String} string The string to mark as field-safe.
 */
function FieldString(string) {
  if (!(this instanceof FieldString)) { return construct(FieldString, arguments); }

  this.string = string;
}

/**
 * Converts to a native string. This is provided to ensure that the string will
 * appear naturally when used via many output options.
 *
 * @return {String} The string
 */
FieldString.prototype.toString = function() {
  return "" + this.string;
};

Condition.FieldString = Condition.f = FieldString;

module.exports = Condition;
