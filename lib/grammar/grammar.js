'use strict';

var _ = require('lodash');
var util = require('util');
var Class = require('../util/class');
var Fragment = require('./fragment');
var FieldString = require('./field');
var LiteralString = require('./literal');

/**
 * Documentation forthcoming.
 *
 * Just for building conditions.
 *
 * @since 1.0
 * @public
 * @constructor
 */
var Grammar = Class.extend(/** @lends Grammar# */ {

  /**
   * Handle a mixed value. This could be a value, literal, or field.
   *
   * @param {LiteralString|FiedlString|Object} [mixed] The value to handle.
   * Type checks will be performed to see if this is a value, literal, or
   * field. Since values do not have specific types, anything that's not a
   * {@link LiteralString} or a {@link FieldString} is assumed to be a value.
   */
  mixed: function(value) {
    var result;
    if (value instanceof LiteralString.__class__) {
      result = value.toString();
    }
    else if (value instanceof FieldString.__class__) {
      result = this.field(value.toString());
    }
    else {
      result = this.value(value);
    }
    return result;
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   * @param {String} string The value to quote.
   * @return {String} A quoted value.
   */
  quote: function(string) {
    return '"' + string + '"';
  },

  /**
   * Escape value to be used directly in a query string.
   *
   * @param {String|Number} value Value to escape.
   * @return {String|Number} The escaped value.
   */
  escape: function(value) {
    var result;
    if (_.isNumber(value)) { result = value;  }
    else if (_.isString(value)) {
      result = '\'' + value.replace('\'', '\'\'') + '\'';
    }
    else { throw new Error(util.format('Cannot escape %j', value)); }
    return result;
  },

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
  field: function(field) {
    var components = field.split('.');
    var quoted = components.map(this.quote, this);
    return quoted.join('.');
  },

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
  value: function(value) {
    return Fragment.create('?', [value]);
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   * @param {String} predicate The predicate format string for the expression.
   * @param {Array.<String|Fragment>} replacements The positional values to
   * use in the predicate format string.
   * @return {Array.<String|Fragment>} An array of fragments.
   */
  expression: function(predicate, replacements) {
    // each of the replacements could be a fragment, so convert everything to
    // a string to make sure we have the proper value. also, extract all args
    // from the replacements for the final fragment creation. finally, call
    // `util.format` with the given predicate and all of the values from the
    // replacements.
    var values = _.invoke(replacements, 'toString');
    var args = _(replacements)
      .filter(function(item) { return item instanceof Fragment.__class__; })
      .flatten(true, 'args').value();
    var string = util.format.apply(null, [predicate].concat(values));
    return [Fragment.create(string, args)];
  },

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
  operation: function(lhs, operator, rhs) {
    return [].concat(lhs, [' ', operator.toUpperCase(), ' '], rhs);
  },

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
  unary: function(operator, operand) {
    return [operator.toUpperCase(), ' '].concat(operand);
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   * @param {(String|Fragment)} expression The expression to group.
   * @return {Array.<String|Fragment>} An array of fragments.
   */
  group: function(expression) {
    return ['(', expression, ')'];
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   * @param {array.<string|fragment>} items the items to delimit.
   * @return {array.<string|fragment>} an array of fragments.
   */
  delimit: function(items) {
    return items.reduce(function(array, item, index) {
      if (index !== 0) { array.push(', '); }
      array.push(item);
      return array;
    }, []);
  },

  /**
   * documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   * @param {Array.<String|Fragment>} fragments An array of fragments.
   * @return {Fragment} A single fragment.
   */
  join: function(fragments) {
    var strings = [];
    var args = [];
    fragments.forEach(function(fragment) {
      strings.push(fragment.toString());
      args = fragment instanceof Fragment.__class__ ?
        args.concat(fragment.args) : args;
    });
    return Fragment.create(strings.join(''), args);
  }

});

Grammar.reopenClass({ __name__: 'Grammar' });
module.exports = Grammar;
