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

  this._construct();
};

Condition.prototype._construct = function() {
  var tree = null;

  // TODO: fix this method, it's overly complex
  var unary = []; // not
  var operator = null; // and, or
  var append = function(subTree) {
    if (operator && !tree) {
      throw new Error('Cannot begin with "' + operator + '" operator');
    }
    if (unary.length && tree && !operator) {
      throw new Error('Unary operator "' + unary.join(' ') + '" between ' +
        'expressions must include explicit binary operator ("and"/"or").')
    }
    while (unary.length) {
      subTree = { type: 'unaryOperation', operator: unary.pop(), operand: subTree };
    }
    if (tree && !operator) { operator = 'and'; }

    tree = tree && operator ? {
      type: 'binaryOperation',
      lhs: tree,
      operator: operator,
      rhs: subTree
    } : subTree;

    operator = null;
  }.bind(this);

  var setOperator = function(op) {
    if (operator) {
      throw new Error('Binary operator "' + op + '" invalid after previous ' +
        'binary operator "' + operator + '"');
    }
    if (unary.length) {
      throw new Error('Binary operator "' + op + '" cannot follow unary "' +
        unary.join(' ') + '"');
    }
    operator = op;

  };

  this._parts.forEach(function(part) {
    if (part === AND) { setOperator('and'); }
    else if (part === OR) { setOperator('or'); }
    else if (part === NOT) { unary.push('not'); }
    else if (part instanceof Condition) {
      append({
        type: 'group',
        group: part._tree
      });
    }
    else {
      Object.keys(part).forEach(function(key) {
        var details = Condition._extractPredicate(key);
        var lhs = { type: 'field', field: details.key };
        var rhs = part[key] instanceof FieldString ?
          { type: 'field', field: part[key].toString() } :
          { type: 'value', value: part[key] };
        append({
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

  return this._tree;
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
