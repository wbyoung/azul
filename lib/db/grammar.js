'use strict';

var util = require('util');

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @constructor
 */
function Grammar() {
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Grammar.prototype.quote = function(string) {
  return '"' + string + '"';
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Grammar.prototype.field = function(field) {
  var components = field.split('.');
  var quoted = components.map(this.quote, this);
  return quoted.join('.');
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Grammar.prototype.value = function(value) {
  return {
    fragment: '?',
    arguments: [value]
  };
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 * @param {Fragment} lhs The left hand side of the expression.
 * @param {String} predicate The predicate for the expression.
 * @param {Fragment} rhs The right hand side of the expression.
 * @return {Fragment)[]} An array of fragments.
 */
Grammar.prototype.expression = function(lhs, predicate, rhs) {

  // TODO: this doesn't feel like it should be part of the grammar
  var predicates = {
    'exact': '=',
    'iexact': 'LIKE',
    'contains': 'LIKE BINARY',
    'icontains': 'LIKE',
    'regex': 'REGEXP BINARY',
    'iregex': 'REGEXP',
    'gt': '>',
    'gte': '>=',
    'lt': '<',
    'lte': '<=',
    'startswith': 'LIKE BINARY',
    'endswith': 'LIKE BINARY',
    'istartswith': 'LIKE',
    'iendswith': 'LIKE',
  };
  predicate = predicates[predicate];

  return [lhs, ' ', predicate, ' ', rhs];
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 * @param {Fragment[]} lhs The left hand side of the operation.
 * @param {String} operator The operator of the operation.
 * @param {Fragment[]} rhs The right hand side of the operation.
 */
Grammar.prototype.operation = function(lhs, operator, rhs) {
  return [].concat(lhs, [' ', operator, ' '], rhs);
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 * @param {String} operator The operator of the operation.
 * @param {Fragment[]} operand The operand of the operation.
 */
Grammar.prototype.unary = function(operator, operand) {
  return [operator, ' '].concat(operand);
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 * @param {Fragment} expression The expression to group.
 */
Grammar.prototype.group = function(expression) {
  return ['(', expression, ')'];
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Grammar.prototype.joinFragments = function(fragments) {
  var strings = [];
  var args = [];
  fragments.forEach(function(fragment) {
    if (typeof fragment === 'string') {
      strings.push(fragment);
    }
    else {
      strings.push(fragment.fragment);
      args = args.concat(fragment.arguments);
    }
  });
  return {
    fragment: strings.join(''),
    arguments: args
  };
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Grammar.extend = function(fns) {
  var SubGrammar;

  SubGrammar = function() { Grammar.apply(this, arguments); }
  SubGrammar.prototype = Object.create(Grammar.prototype);
  SubGrammar.prototype.constructor = SubGrammar;

  Object.keys(fns).forEach(function(key) {
    SubGrammar.prototype[key] = fns[key];
  });

  return SubGrammar;
};

module.exports = Grammar;
