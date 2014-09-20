'use strict';

var construct = require('../../util/construct');
var Class = require('../../util/class');
var FieldString = require('./field');
var Operation = require('./operation');
var Node = require('./node');


/**
 * Conditions allow the construction of expressions to limit queries. They are
 * usually constructed using the more terse `w` syntax (an abbreviation for
 * where). This syntax will be used throughout the documentation here. Basic
 * conditions are simply created through a natural syntax. For instance:
 *
 *     w({ firstName: 'Whitney' }, w.and, { lastName: 'Young' })
 *
 * Conditions that are base around simple `and` operations can omit the
 * explicit `and` or specify multiple conditions via a single object:
 *
 *     w({ firstName: 'Whitney' }, { lastName: 'Young' })
 *     w({ firstName: 'Whitney', lastName: 'Young' })
 *
 * Conditions can also be nested to create more complex expressions:
 *
 *     w(w({ firstName: 'Whintey' }, w.or, { firstName: 'Whit' }), w.and, { lastName: 'Young' })
 *
 * In many places throughout Agave, you can pass simple objects and they'll be
 * converted to conditions automatically. For instance, a select statement can
 * be written with or without the `w`. The shorter form is preferred since it
 * doesn't cause any ambiguity in what the code does.
 *
 *     select('cities').where({ name: 'Portland' })
 *     select('cities').where(w({ name: 'Portland' }))
 *
 * @since 1.0
 * @public
 * @constructor
 * @param {...(Object|Condition)} conditions Objects used to express a
 * condition.
 */
var Condition = Class.extend({
  init: function() {
    // check for simple wrapping of condition
    if (arguments.length === 1 && arguments[0] instanceof Condition) {
      return arguments[0];
    }

    this._tree = undefined;
    this._parts = [];
    this._initialize(Array.prototype.slice.call(arguments));
  }
});

/**
 * The `or` operation can be used to join two logical expressions and can be
 * used to create complex conditions.
 *
 * @since 1.0
 * @constant {Object} Condition.or
 */

/**
 * Alias for {@link Condition.or}.
 * @constant {Object} Condition.OR
 * @since  1.0
 */
Condition.or = Condition.OR = new Operation.Binary('or');


/**
 * The `and` operation can be used to join two logical expressions and can be
 * used to create complex conditions.
 *
 * @since 1.0
 * @constant {Object} Condition.and
 */

/**
 * Alias for {@link Condition.and}.
 * @constant {Object} Condition.AND
 * @since  1.0
 */
Condition.and = Condition.AND = new Operation.Binary('and');


/**
 * The `not` operation can be used as a prefix to a logical expressions and can
 * be used to create complex conditions.
 *
 * @since 1.0
 * @constant {Object} Condition.not
 */

/**
 * Alias for {@link Condition.not}.
 * @constant {Object} Condition.NOT
 * @since  1.0
 */
Condition.not = Condition.NOT = new Operation.Unary('not');


/**
 * Initialize the condition performing all required validations of syntax
 * and building an internal tree-based representation of the condition.
 *
 * @method
 * @private
 * @param {Array.<(Array|Object|Condition|Operation)>} parts The parts that
 * were given to the constructor.
 */
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


/**
 * Validate unary operations.
 * This method is intended for use during initialization only.
 *
 * @method
 * @private
 * @see {@link Condition#_validate}
 */
Condition.prototype._validateUnaryOperations = function() {
  this._parts.forEach(function(part, index) {
    if (!(part instanceof Operation.Unary)) { return; }

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


/**
 * Validate binary operations.
 * This method is intended for use during initialization only.
 *
 * @method
 * @private
 * @see {@link Condition#_validate}
 */
Condition.prototype._validateBinaryOperations = function() {
  this._parts.forEach(function(part, index) {
    if (!(part instanceof Operation.Binary)) { return; }

    var previous = this._parts[index-1];
    var next = this._parts[index+1];
    if (!previous) {
      throw new Error('Binary operator "' + part.name + '" must include left hand expression');
    }
    else if (!next) {
      throw new Error('Binary operator "' + part.name + '" must include right hand expression');
    }
    else if (previous instanceof Operation.Binary) {
      throw new Error('Binary operator "' + part.name + '" invalid after previous ' +
        'binary operator "' + previous.name + '"');
    }
    else if (previous instanceof Operation.Unary) {
      throw new Error('Binary operator "' + part.name + '" cannot follow unary "' +
        previous.name + '"');
    }
  }, this);
};


/**
 * Perform all initialization validations.
 *
 * @method
 * @private
 */
Condition.prototype._validate = function() {
  if (this._parts.length === 0) {
    throw new Error('Condition required');
  }
  this._validateUnaryOperations();
  this._validateBinaryOperations();
};


/**
 * Construct an internal tree-based representation of the condition.
 * This method is intended for use during initialization only.
 *
 * @method
 * @private
 */
Condition.prototype._construct = function() {
  var parts = this._parts;
  parts = this._extractNodes(parts);
  parts = this._reduceUnary(parts);
  parts = this._reduceBinary(parts);

  // the reduction of binary and unary parts should always result
  // in a single part remaining. if not, something went wrong.
  if (parts.length !== 1) {
    throw new Error('Binary reduction failed to yield a single expression.');
  }

  this._tree = new Node({
    type: 'tree',
    tree: parts[0]
  });
};


/**
 * Initialization method for extracting tree nodes. This method transforms
 * objects and sub-conditions into tree `Node` objects. These tree nodes
 * are later used to build the internal representation of the condition.
 * Converting to tree nodes is the first step in initializing a condition.
 *
 * @method
 * @private
 * @param {Array.<(Object|Condition|Operation)>} parts The array of parts to
 * convert.
 * @return {Array.<(Node|Operation)>} The parts with all appropriate types
 * converted to tree nodes.
 */
Condition.prototype._extractNodes = function(parts) {
  var result = [];

  parts.forEach(function(part) {
    if (part instanceof Operation) { result.push(part); } // ignore
    else if (part instanceof Condition) {
      result.push(new Node({ type: 'group',  group: part._tree }));
    }
    else {
      Object.keys(part).forEach(function(key) {
        var details = Condition._extractPredicate(key);
        var lhs = new Node({ type: 'field', field: details.key });
        var rhs = part[key] instanceof FieldString ?
          new Node({ type: 'field', field: part[key].toString() }) :
          new Node({ type: 'value', value: part[key] });
        result.push(new Node({
          type: 'expression',
          lhs: lhs,
          predicate: details.predicate,
          rhs: rhs
        }));
      });
    }
  });

  return result;
};


/**
 * Initialization method for reducing unary parts. This method reduces unary
 * operations into a single tree node. For instance, it will convert
 * `[w.not, w.not, new Node()]` into a single node tree that represents the
 * application of the first two negations to the final node.
 *
 * @method
 * @private
 * @param {Array.<(Node|Operation)>} parts The array of parts to convert.
 * @return {Array.<(Node|Operation)>} The parts with all appropriate types
 * converted to tree nodes.
 */
Condition.prototype._reduceUnary = function(parts) {
  var result = [];
  var unary = [];

  parts.forEach(function(part) {
    if (part instanceof Operation.Unary) {
      unary.push(part.name);
    }
    else {
      while (unary.length) {
        part = new Node({
          type: 'unaryOperation',
          operator: unary.pop(),
          operand: part
        });
      }
      result.push(part);
    }
  });

  return result;
};


/**
 * Initialization method for reducing binary parts. This method reduces binary
 * operations into a single tree node. For instance, it will convert
 * `[new Node(), w.and, new Node()]` into a single node tree that represents
 * the application of the binary operation to the two surrounding operands.
 *
 * @method
 * @private
 * @param {Array.<(Node|Operation)>} parts The array of parts to convert.
 * @return {Array.<(Node|Operation)>} The parts with all appropriate types
 * converted to tree nodes.
 */
Condition.prototype._reduceBinary = function(parts) {
  var tree = null;
  var operator = null; // and, or

  parts.forEach(function(part) {
    if (part instanceof Operation.Binary) { operator = part.name; }
    else {
      tree = tree ? new Node({
        type: 'binaryOperation',
        lhs: tree,
        operator: operator || 'and',
        rhs: part
      }) : part;
      operator = null;
    }
  });

  return [tree];
};


/**
 * Recursively build tree-nodes of the condition with a specified grammar.
 *
 * @private
 * @method
 * @param {Grammar} grammar The grammar to use to construct the condition
 * @param {Node} item The tree node to build.
 * @return {Fragment} The fragment that results from building the condition.
 */
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
 * Build a condition with a specific grammar.
 *
 * The building of conditions is usually done internally by Agave before
 * queries are sent to specific databases. This function can be used with
 * a grammar, though, to generate the string for a condition when given a
 * specific grammar.
 *
 * @since 1.0
 * @public
 * @method
 */
Condition.prototype.build = function(grammar) {
  return this._build(grammar, this._tree);
};


/**
 * Extract a predicate from the given key. This method is used to extract the
 * components of a key based predicate.
 *
 * @private
 * @function
 * @param {String} keypred The key based predicate.
 * @return {{key: String, predicate: String}} The resulting details.
 * @example
 *
 *     _extractPredicate('name[like]') //=> { key: 'name', predicate: 'like' }
 *     _extractPredicate('id') //=> { key: 'id', predicate: 'exact' }
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

Condition.FieldString = Condition.f = FieldString;

module.exports = Condition;
