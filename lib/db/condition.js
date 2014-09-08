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

function Operation(name) { this.name = name; }

function UnaryOperation() { Operation.apply(this, arguments); }
UnaryOperation.prototype = Object.create(Operation.prototype);

function BinaryOperation() { Operation.apply(this, arguments); }
BinaryOperation.prototype = Object.create(Operation.prototype);

var OR = new BinaryOperation('or');
var AND = new BinaryOperation('and');
var NOT = new UnaryOperation('not');

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

  this._validate();
  this._construct();
};

Condition.prototype._validateUnaryOperations = function() {
  this._parts.forEach(function(part, index) {
    if (!(part instanceof UnaryOperation)) { return; }

    var previous = this._parts[index-1];
    var next = this._parts[index+1];
    if (previous && !(previous instanceof Operation)) {
      throw new Error('Unary operator "' + part.name + '" between ' +
        'expressions must include explicit binary operator ("and"/"or").')
    }
    else if (!next) {
      throw new Error('Unary operator "' + part.name + '" must precede expression');
    }
  }, this);
};

Condition.prototype._validateBinaryOperations = function() {
  this._parts.forEach(function(part, index) {
    if (!(part instanceof BinaryOperation)) { return; }

    var previous = this._parts[index-1];
    var next = this._parts[index+1];
    if (!previous) {
      throw new Error('Binary operator "' + part.name + '" must include left hand expression');
    }
    else if (!next) {
      throw new Error('Binary operator "' + part.name + '" must include right hand expression');
    }
    else if (previous instanceof BinaryOperation) {
      throw new Error('Binary operator "' + part.name + '" invalid after previous ' +
        'binary operator "' + previous.name + '"');
    }
    else if (previous instanceof UnaryOperation) {
      throw new Error('Binary operator "' + part.name + '" cannot follow unary "' +
        previous.name + '"');
    }
  }, this);
};

Condition.prototype._validate = function() {
  if (this._parts.length === 0) {
    throw new Error('Condition required');
  }
  this._validateUnaryOperations();
  this._validateBinaryOperations();
};

Condition.prototype._construct = function() {
  var tree = null;
  var operator = null; // and, or
  var unary = [];
  var binaryOperation = function(expression) {
    while (unary.length) {
      expression = { type: 'unaryOperation', operator: unary.pop(), operand: expression };
    }
    tree = tree ? {
      type: 'binaryOperation',
      lhs: tree,
      operator: operator || 'and',
      rhs: expression
    } : expression;
    operator = null;
  };

  this._parts.forEach(function(part) {
    if (part instanceof BinaryOperation) { operator = part.name; }
    else if (part instanceof UnaryOperation) { unary.push(part.name); }
    else if (part instanceof Condition) {
      binaryOperation({ type: 'group',  group: part._tree });
    }
    else {
      Object.keys(part).forEach(function(key) {
        var details = Condition._extractPredicate(key);
        var lhs = { type: 'field', field: details.key };
        var rhs = part[key] instanceof FieldString ?
          { type: 'field', field: part[key].toString() } :
          { type: 'value', value: part[key] };
        binaryOperation({
          type: 'expression',
          lhs: lhs,
          predicate: details.predicate,
          rhs: rhs
        });
      });
    }
  });

  this._tree = {
    type: 'tree',
    tree: tree
  };
};

Condition.prototype._build = function(grammar, item) {
  var result;

  if (item.type === 'tree') {
    result = grammar.joinFragments(this._build(grammar, item.tree));
  }
  else if (item.type === 'binaryOperation') {
    result = grammar.operation(
      this._build(grammar, item.lhs), item.operator,
      this._build(grammar, item.rhs));
  }
  else if (item.type === 'unaryOperation') {
    result = grammar.unary( item.operator,
      this._build(grammar, item.operand));
  }
  else if (item.type === 'group') {
    result = grammar.group(
      this._build(grammar, item.group));
  }
  else if (item.type === 'expression') {
    result = grammar.expression(
      this._build(grammar, item.lhs), item.predicate,
      this._build(grammar, item.rhs));
  }
  else if (item.type === 'field') {
    result = grammar.field(item.field);
  }
  else if (item.type === 'value') {
    result = grammar.value(item.value);
  }

  return result;
}


/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Condition.prototype.build = function(grammar) {
  return this._build(grammar, this._tree);
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @protected
 * @method
 */
Condition._extractPredicate = function(keypred) {
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
