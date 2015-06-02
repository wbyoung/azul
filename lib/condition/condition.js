'use strict';

var _ = require('lodash');
var Class = require('corazon/class');
var FieldString = require('../types/field');
var LiteralString = require('../types/literal');
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
Condition.or =
Condition.OR =
Condition['||'] =
Operation.Binary.create('or');


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
Condition.and =
Condition.AND =
Condition['&&'] =
Operation.Binary.create('and');


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
Condition.not =
Condition.NOT =
Condition['!'] =
Operation.Unary.create('not');


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
  return Node.create('leaf', [], { value: value });
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
      else if (typeof part === 'string' && part.indexOf('=') >= 0) {
        var pair = part.split('=');
        var key = pair[0];
        var value = FieldString.create(pair[1]);
        var object = {};
        object[key] = value;
        this._parts.push(object);
      }
      else if (typeof part === 'string') {
        this._parts.push(this.__identity__[part]);
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

    this._tree = Node.create('tree', parts);
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
        result.push(Node.create('group', [part._tree]));
      }
      else {
        Object.keys(part).forEach(function(key) {
          var details = Condition._extractPredicate(key);
          var lhs = createLeaf(FieldString.create(details.key));
          var rhs = createLeaf(part[key]);
          result.push(Node.create('expression', [lhs, rhs], {
            predicate: details.predicate
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
          part = Node.create('unaryOperation', [part], {
            operator: unary.pop()
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
        tree = tree ? Node.create('binaryOperation', [tree, part], {
          operator: operator || 'and'
        }) : part;
        operator = null;
      }
    });

    return [tree];
  }
});


Condition.reopen(/** @lends Condition# */ {

  /**
   * Reduce a tree node.
   *
   * @method
   * @private
   * @see {@link Condition#build~}
   * @see {@link Condition#NodeReduceFunction}
   */
  _reduceTreeNode: function(item, grammar, tree) {
    return grammar.join(tree);
  },

  /**
   * Reduce a binary operation node.
   *
   * @method
   * @private
   * @see {@link Condition#build~}
   * @see {@link Condition#NodeReduceFunction}
   */
  _reduceBinaryOperationNode: function(item, grammar, lhs, rhs) {
    return grammar.operation(lhs, item.attrs.operator, rhs);
  },

  /**
   * Reduce a unary operation node.
   *
   * @method
   * @private
   * @see {@link Condition#build~}
   * @see {@link Condition#NodeReduceFunction}
   */
  _reduceUnaryOperationNode: function(item, grammar, operand) {
    return grammar.unary(item.attrs.operator, operand);
  },

  /**
   * Reduce a group node.
   *
   * @method
   * @private
   * @see {@link Condition#build~}
   * @see {@link Condition#NodeReduceFunction}
   */
  _reduceGroupNode: function(item, grammar, group) {
    return grammar.group(group);
  },

  /**
   * Reduce an expression node. Note that the expression node will have been
   * transformed by this point as well.
   *
   * @method
   * @private
   * @see {@link Condition#build~}
   * @see {@link Condition#NodeReduceFunction}
   */
  _reduceExpressionNode: function(/*item, grammar, child...*/) {
    var args = _.toArray(arguments);
    var item = args.shift();
    var grammar = args.shift();
    var children = args;
    return grammar.expression(item.attrs.format, children);
  },

  /**
   * Transform an expression node. This transformation is required to support
   * the mapping of predicates using the translator. A new node must be created
   * because the number of arguments returned by {@Translator#predicate} could
   * be different from the 2 that we will give it. Also, they could change from
   * being one supported leaf node type to another (for instance string to
   * literal).
   *
   * @method
   * @private
   * @see {@link Condition#build~}
   * @see {@link Condition#NodeTransformFunction}
   */
  _transformExpressionNode: function(item, translator) {
    if (item.firstChild.type !== 'leaf') {
      throw new Error('Left hand side of expression  must be a leaf node.');
    }
    if (item.secondChild.type !== 'leaf') {
      throw new Error('Right hand side of expression must be a leaf node.');
    }

    // knowing that both the left hand and right hand sides of the expression
    // must be leaf nodes, the `value` is extracted from each so they can be
    // sent to to the translator's predicate function for possible alteration.
    // afterwards, they're converted back into leaf nodes before being built
    // recursively.
    var values = _(item.children).map('attrs').map('value').value();
    var predicate = translator.predicate(item.attrs.predicate, values);
    var format = predicate.format;
    var newLeaves = predicate.args.map(createLeaf);

    return Node.create('expression', newLeaves, {
      format: format
    });
  },

  /**
   * Reduce a leaf node.
   *
   * @method
   * @private
   * @see {@link Condition#build~}
   * @see {@link Condition#NodeReduceFunction}
   */
  _reduceLeafNode: function(item, grammar) {
    return grammar.mixed(item.attrs.value);
  },

  /**
   * @function Condition#NodeTransformFunction
   * @param {Node} item The node to transform to a new node.
   * @param {Translator} translator
   */

  /**
   * @function Condition#NodeReduceFunction
   * @param {Node} item The node to reduce to a fragment/statement.
   * @param {Grammar} grammar
   * @param {...Object} child Each of the children, spread when called.
   */

  /**
   * Build the condition from the {@link Node} objects. This method uses
   * {@link Node#transform} and {@link Node#reduce} to build the condition
   * and uses the private methods that are named `_transform<Type>Node` and
   * `_reduce<Type>Node` to do so. Each part of the build process is therefore
   * documented under the individual functions.
   *
   * The transform process is straight-forward. It simply transforms each node
   * using the relevant `_transform<Type>Node` method (if it exists). See
   * {@link Condition#NodeTransformFunction}.
   *
   * The reduce process is slightly more complicated. It will call the relevant
   * `_reduce<Type>Node`, but the reduced values from child nodes will be
   * appended to the argument list. See
   * {@link Condition#NodeReduceFunction}.
   *
   * @method Condition#build
   * @private
   * @param {Grammar} grammar
   * @param {Translator} translator
   * @see {@link Condition#NodeTransformFunction}
   * @see {@link Condition#NodeReduceFunction}
   */

  /**
   * Build a condition with a specific grammar.
   *
   * The building of conditions is usually done internally by Azul before
   * queries are sent to specific databases. This function can be used with
   * a grammar, though, to generate the string for a condition when given a
   * specific grammar.
   *
   * @method
   * @public
   * @param {Grammar} grammar The grammar to use to build the condition.
   * @param {Translator} translator The translator to use to build the
   * condition.
   */
  build: function(grammar, translator) {
    var transform = function(item) {
      var method = '_transform' + _.capitalize(item.type) + 'Node';
      return this[method] ? this[method](item, translator) : item;
    };
    var reduce = function(item, children) {
      var method = '_reduce' + _.capitalize(item.type) + 'Node';
      var args = [item, grammar].concat(children);
      return this[method].apply(this, args);
    };
    return this._tree.transform(transform, this).reduce(reduce, this);
  }
});

/**
 * Check if a node is an expression node with a {@link FieldString} as its left
 * hand child node.
 *
 * @function Condition~isExpressionNodeWithLeftHandFieldString
 * @private
 * @param {Node} node
 * @return {Boolean}
 */
var isExpressionNodeWithLeftHandFieldString = function(node) {
  return node.type === 'expression' &&
    node.firstChild.type === 'leaf' &&
    node.firstChild.attrs.value instanceof FieldString.__class__ &&
    node.secondChild.type === 'leaf';
};

/**
 * Check if a node is a leaf with a {@link FieldString} value.
 *
 * @function Condition~isLeafNodeWithFieldString
 * @private
 * @param {Node} node
 * @return {Boolean}
 */
var isLeafNodeWithFieldString = function(node) {
  return node.type === 'leaf' &&
    node.attrs.value instanceof FieldString.__class__;
};

Condition.reopen(/** @lends Condition# */ {

  /**
   * @function Condition~ExpressionTransformFunction
   * @param {String} predicate The predicate being used.
   * @param {String} field The field name to transform.
   * @param {String} value The value to transform.
   * @return {Array} The tuple of the transformed field name & value.
   */

  /**
   * Transform fields & values of the expressions used within the condition.
   * This can be used, for instance, to alter values that need to be mapped to
   * underlying database values (such as Model instances). For instance, you
   * could transform the expression with `field` set to the string `author` and
   * the `value` set to an instance of the `Author` class to instead be the
   * string `author.id` and the author's primary key.
   *
   * @method
   * @protected
   * @param {Condition~ExpressionTransformFunction} fn The transformation
   * function.
   * @return {Condition} A new condition that has the transformation applied.
   */
  transformExpressions: function(fn) {
    var transform = function(node) {
      if (isExpressionNodeWithLeftHandFieldString(node)) {
        var lhs = node.firstChild.attrs; // field string
        var rhs = node.secondChild.attrs; // arbitrary
        var transformed = fn(node.attrs.predicate,
          lhs.value.toString(), rhs.value);
        var newLeaves = [
          createLeaf(FieldString.create(transformed[0])),
          createLeaf(transformed[1]),
        ];
        node = Node.create('expression', newLeaves, node.attrs);
      }
      return node;
    };

    var result = Condition.new();
    result._tree = this._tree.transform(transform);
    result._parts = this._parts;
    return result;
  },

  /**
   * @function Condition~FieldReduceFunction
   * @param {Object} accumulator The value of the accumulator.
   * @param {String} field The field name to reduce.
   * @return {Object} The new value of the accumulator.
   */

  /**
   * Reduce the names of fields used within the condition.
   *
   * @method
   * @protected
   * @param {Condition~FieldReduceFunction} fn The reduce function.
   */
  reduceFields: function(fn, accumulator) {
    var reduction = function(node) {
      if (isLeafNodeWithFieldString(node)) {
        accumulator = fn(accumulator, node.attrs.value.toString());
      }
    };
    this._tree.reduce(reduction);
    return accumulator;
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
    var match =
      keypred.match(/(.*)\$(\w+)/) ||
      keypred.match(/(.*)\[(\w+)\]/);
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
