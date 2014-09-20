'use strict';

var _ = require('lodash');
var util = require('util');
var Fragment = require('./fragment');


// TODO: it could be a good idea to rename this class

/**
 * Documentation forthcoming.
 *
 * Just for building conditions.
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
 * @param {String} string The value to quote.
 * @return {String} A quoted value.
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
 * @param {String} string The field name to escape.
 * @return {(String|Fragment)} The field name converted to a fragment and
 * converted as required.
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
 * @param {string} value A value to handle.
 * @return {(String|Fragment)} The value converted to a fragment and converted
 * as required.
 */
Grammar.prototype.value = function(value) {
  return new Fragment('?', [value]);
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 * @param {(String|Fragment)} lhs The left hand side of the expression.
 * @param {String} predicate The predicate for the expression.
 * @param {(String|Fragment)} rhs The right hand side of the expression.
 * @return {Array.<String|Fragment>} An array of fragments.
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
 * @param {Array.<String|Fragment>} lhs The left hand side of the operation.
 * @param {String} operator The operator of the operation.
 * @param {Array.<String|Fragment>} rhs The right hand side of the operation.
 * @return {Array.<String|Fragment>} An array of fragments.
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
 * @param {Array.<String|Fragment>} operand The operand of the operation.
 * @return {Array.<String|Fragment>} An array of fragments.
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
 * @param {(String|Fragment)} expression The expression to group.
 * @return {Array.<String|Fragment>} An array of fragments.
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
 * @param {Array.<String|Fragment>} fragments An array of fragments.
 * @return {Fragment} A single fragment.
 */
Grammar.prototype.joinFragments = function(fragments) {
  var strings = [];
  var args = [];
  fragments.forEach(function(fragment) {
    strings.push(fragment.toString());
    args = fragment instanceof Fragment ?
      args.concat(fragment.arguments) : args;
  });
  return new Fragment(strings.join(''), args);
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
  _.extend(SubGrammar.prototype, fns);

  return SubGrammar;
};

module.exports = Grammar;
