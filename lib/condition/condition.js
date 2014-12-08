'use strict';

var _ = require('lodash');
var Class = require('../util/class');
var FieldString = require('../grammar/field');
var LiteralString = require('../grammar/literal');
var Operation = require('./operation');
var Node = require('./node');

_.str = require('underscore.string');


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
 * In many places throughout Azul, you can pass simple objects and they'll be
 * converted to conditions automatically. For instance, a select statement can
 * be written with or without the `w`. The shorter form is preferred since it
 * doesn't cause any ambiguity in what the code does.
 *
 *     select('cities').where({ name: 'Portland' })
 *     select('cities').where(w({ name: 'Portland' }))
 *
 * @public
 * @constructor
 * @param {...(Object|Condition)} conditions Objects used to express a
 * condition.
 */
var Condition = Class.extend({ /** @lends Condition# */
  init: function() {
    this._super();

    // check for simple wrapping of condition
    if (arguments.length === 1 && arguments[0] instanceof Condition.__class__) {
      return arguments[0];
    }

    this._tree = undefined;
    this._parts = [];
    this._initialize(_.toArray(arguments));
  }
});

/**
 * The `or` operation can be used to join two logical expressions and can be
 * used to create complex conditions.
 *
 * @constant {Object} Condition.or
 */

/**
 * Alias for {@link Condition.or}.
 * @constant {Object} Condition.OR
 * @since  1.0
 */
Condition.or = Condition.OR = Operation.Binary.create('or');


/**
 * The `and` operation can be used to join two logical expressions and can be
 * used to create complex conditions.
 *
 * @constant {Object} Condition.and
 */

/**
 * Alias for {@link Condition.and}.
 * @constant {Object} Condition.AND
 * @since  1.0
 */
Condition.and = Condition.AND = Operation.Binary.create('and');


/**
 * The `not` operation can be used as a prefix to a logical expressions and can
 * be used to create complex conditions.
 *
 * @constant {Object} Condition.not
 */

/**
 * Alias for {@link Condition.not}.
 * @constant {Object} Condition.NOT
 * @since  1.0
 */
Condition.not = Condition.NOT = Operation.Unary.create('not');


/**
 * Helper method to create leaf nodes. Leaf nodes can be any type of object.
 * If they are instances of {@link FieldString} or {@link LiteralString} they
 * will be treated as such during the process of building the condition. Any
 * other type of object will be treated as a value.
 *
 * @function Condition~createLeaf
 * @private
 * @param {Object} value The value of the leaf node.
 * @return {Node} The leaf node.
 */
var createLeaf = function(value) {
  return Node.create({ type: 'leaf', value: value });
};

Condition.reopen(/** @lends Condition# */ {

  /**
   * Initialize the condition performing all required validations of syntax
   * and building an internal tree-based representation of the condition.
   *
   * @method
   * @private
   * @param {Array.<(Array|Object|Condition|Operation)>} parts The parts that
   * were given to the constructor.
   */
  _initialize: function(parts) {
    parts.forEach(function(part) {
      if (Array.isArray(part)) {
        this._parts.push(Condition.create.apply(Condition, part));
      }
      else if (typeof part === 'string') {
        var pair = part.split('=');
        var key = pair[0];
        var value = FieldString.create(pair[1]);
        var object = {};
        object[key] = value;
        this._parts.push(object);
      }
      else {
        this._parts.push(part);
      }
    }, this);

    this._validate();
    this._construct();
  },


  /**
   * Validate unary operations.
   * This method is intended for use during initialization only.
   *
   * @method
   * @private
   * @see {@link Condition#_validate}
   */
  _validateUnaryOperations: function() {
    this._parts.forEach(function(part, index) {
      if (!(part instanceof Operation.Unary.__class__)) { return; }

      var previous = this._parts[index-1];
      var next = this._parts[index+1];
      if (previous && !(previous instanceof Operation.__class__)) {
        throw new Error('Unary operator "' + part.name + '" between ' +
          'expressions must include explicit binary operator ("and"/"or").');
      }
      else if (!next) {
        throw new Error('Unary operator "' + part.name + '" must precede expression');
      }
    }, this);
  },


  /**
   * Validate binary operations.
   * This method is intended for use during initialization only.
   *
   * @method
   * @private
   * @see {@link Condition#_validate}
   */
  _validateBinaryOperations: function() {
    this._parts.forEach(function(part, index) {
      if (!(part instanceof Operation.Binary.__class__)) { return; }

      var previous = this._parts[index-1];
      var next = this._parts[index+1];
      if (!previous) {
        throw new Error('Binary operator "' + part.name + '" must include left hand expression');
      }
      else if (!next) {
        throw new Error('Binary operator "' + part.name + '" must include right hand expression');
      }
      else if (previous instanceof Operation.Binary.__class__) {
        throw new Error('Binary operator "' + part.name + '" invalid after previous ' +
          'binary operator "' + previous.name + '"');
      }
      else if (previous instanceof Operation.Unary.__class__) {
        throw new Error('Binary operator "' + part.name + '" cannot follow unary "' +
          previous.name + '"');
      }
    }, this);
  },


  /**
   * Perform all initialization validations.
   *
   * @method
   * @private
   */
  _validate: function() {
    if (this._parts.length === 0) {
      throw new Error('Condition required');
    }
    this._validateUnaryOperations();
    this._validateBinaryOperations();
  },


  /**
   * Construct an internal tree-based representation of the condition.
   * This method is intended for use during initialization only.
   *
   * @method
   * @private
   */
  _construct: function() {
    var parts = this._parts;
    parts = this._extractNodes(parts);
    parts = this._reduceUnary(parts);
    parts = this._reduceBinary(parts);

    // the reduction of binary and unary parts should always result
    // in a single part remaining. if not, something went wrong.
    if (parts.length !== 1) {
      throw new Error('Binary reduction failed to yield a single expression.');
    }

    this._tree = Node.create({
      type: 'tree',
      tree: parts[0]
    });
  },


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
  _extractNodes: function(parts) {
    var result = [];

    parts.forEach(function(part) {
      if (part instanceof Operation.__class__) { result.push(part); } // ignore
      else if (part instanceof Condition.__class__) {
        result.push(Node.create({ type: 'group',  group: part._tree }));
      }
      else {
        Object.keys(part).forEach(function(key) {
          var details = Condition._extractPredicate(key);
          var lhs = createLeaf(FieldString.create(details.key));
          var rhs = createLeaf(part[key]);
          result.push(Node.create({
            type: 'expression',
            lhs: lhs,
            predicate: details.predicate,
            rhs: rhs
          }));
        });
      }
    });

    return result;
  },


  /**
   * Initialization method for reducing unary parts. This method reduces unary
   * operations into a single tree node. For instance, it will convert
   * `[w.not, w.not, Node.create()]` into a single node tree that represents the
   * application of the first two negations to the final node.
   *
   * @method
   * @private
   * @param {Array.<(Node|Operation)>} parts The array of parts to convert.
   * @return {Array.<(Node|Operation)>} The parts with all appropriate types
   * converted to tree nodes.
   */
  _reduceUnary: function(parts) {
    var result = [];
    var unary = [];

    parts.forEach(function(part) {
      if (part instanceof Operation.Unary.__class__) {
        unary.push(part.name);
      }
      else {
        while (unary.length) {
          part = Node.create({
            type: 'unaryOperation',
            operator: unary.pop(),
            operand: part
          });
        }
        result.push(part);
      }
    });

    return result;
  },


  /**
   * Initialization method for reducing binary parts. This method reduces binary
   * operations into a single tree node. For instance, it will convert
   * `[Node.create(), w.and, Node.create()]` into a single node tree that represents
   * the application of the binary operation to the two surrounding operands.
   *
   * @method
   * @private
   * @param {Array.<(Node|Operation)>} parts The array of parts to convert.
   * @return {Array.<(Node|Operation)>} The parts with all appropriate types
   * converted to tree nodes.
   */
  _reduceBinary: function(parts) {
    var tree = null;
    var operator = null; // and, or

    parts.forEach(function(part) {
      if (part instanceof Operation.Binary.__class__) { operator = part.name; }
      else {
        tree = tree ? Node.create({
          type: 'binaryOperation',
          lhs: tree,
          operator: operator || 'and',
          rhs: part
        }) : part;
        operator = null;
      }
    });

    return [tree];
  },


  /**
   * Recursively build tree-nodes of the condition with a specified grammar.
   *
   * @private
   * @method
   * @param {Node} item The tree node to build.
   * @param {Object} options The options for building.
   * @param {Grammar} options.grammar The grammar to use to construct the
   * condition.
   * @param {Translator} options.translator The translator to use to construct
   * the condition.
   * @param {Function} [options.valueTranform] A value transformation function,
   * supplied during the building process, for values that must be altered
   * in order to properly be used as part of an expression.
   * @return {Fragment} The fragment that results from building the condition.
   */
  _build: function(item, options) {
    var method = '_build' + _.str.capitalize(item.type);
    return this[method](item, options);
  },

  /**
   * Build tree & continue recursive build process.
   *
   * @private
   * @method
   * @see {@link Condition#_build}
   */
  _buildTree: function(item, opts) {
    var grammar = opts.grammar;
    return grammar.join(this._build(item.tree, opts));
  },

  /**
   * Build binary operation & continue recursive build process.
   *
   * @private
   * @method
   * @see {@link Condition#_build}
   */
  _buildBinaryOperation: function(item, opts) {
    var grammar = opts.grammar;
    return grammar.operation(
      this._build(item.lhs, opts), item.operator,
      this._build(item.rhs, opts));
  },

  /**
   * Build unary operation & continue recursive build process.
   *
   * @private
   * @method
   * @see {@link Condition#_build}
   */
  _buildUnaryOperation: function(item, opts) {
    var grammar = opts.grammar;
    return grammar.unary(item.operator,
      this._build(item.operand, opts));
  },

  /**
   * Build group & continue recursive build process.
   *
   * @private
   * @method
   * @see {@link Condition#_build}
   */
  _buildGroup: function(item, opts) {
    var grammar = opts.grammar;
    return grammar.group(
      this._build(item.group, opts));
  },

  /**
   * Build expression & continue recursive build process.
   *
   * @private
   * @method
   * @see {@link Condition#_build}
   */
  _buildExpression: function(item, opts) {
    var grammar = opts.grammar;
    var translator = opts.translator;

    if (item.lhs.type !== 'leaf') {
      throw new Error('Left hand side of expression  must be a leaf node.');
    }
    if (item.rhs.type !== 'leaf') {
      throw new Error('Right hand side of expression must be a leaf node.');
    }
    var buildNode = function(node) {
      return this._build(node, opts);
    }.bind(this);

    // knowing that both the left hand and right hand sides of the expression
    // must be leaf nodes, the `value` is extracted from each so they can be
    // sent to to the translator's predicate function for possible alteration.
    // afterwards, they're converted back into leaf nodes before being built
    // recursively.
    var args = [item.lhs, item.rhs];
    var predicate = translator.predicate(item.predicate,
      _.pluck(args, 'value'));
    var format = predicate.format;
    var finalArgs = predicate.args
      .map(createLeaf)
      .map(buildNode);

    return grammar.expression(format, finalArgs);
  },

  /**
   * Build leaf & continue recursive build process.
   *
   * @private
   * @method
   * @see {@link Condition#_build}
   */
  _buildLeaf: function(item, opts) {
    var grammar = opts.grammar;
    return grammar.mixed(item.value);
  },


  /**
   * Build a condition with a specific grammar.
   *
   * The building of conditions is usually done internally by Azul before
   * queries are sent to specific databases. This function can be used with
   * a grammar, though, to generate the string for a condition when given a
   * specific grammar.
   *
   * @public
   * @method
   */
  build: function(grammar, translator) {
    return this._build(this._tree, {
      grammar: grammar,
      translator: translator
    });
  }
});


Condition.reopenClass(/** @lends Condition */ {
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
   *     _extractPredicate('name[like]') // => { key: 'name', predicate: 'like' }
   *     _extractPredicate('id') // => { key: 'id', predicate: 'exact' }
   */
  _extractPredicate: function(keypred) {
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
  }
});


Condition.reopenClass(/** @lends Condition */ {
  FieldString: FieldString,
  f: FieldString.f,
  l: LiteralString.l,
  w: _.extend(Condition.create.bind(Condition), Condition)
});


module.exports = Condition.reopenClass({ __name__: 'Condition' });
