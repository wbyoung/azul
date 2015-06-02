'use strict';

var _ = require('lodash');
var util = require('util');
var Class = require('corazon/class');
var Fragment = require('../types/fragment');
var FieldString = require('../types/field');
var LiteralString = require('../types/literal');

/**
 * The grammar class is used strictly for formatting. It defines operations to
 * quote & escape fragments as well as join them together.
 *
 * @public
 * @constructor
 */
var Grammar = Class.extend(/** @lends Grammar# */ {

  /**
   * Handle a mixed value. This could be a value, literal, or field.
   *
   * @method
   * @public
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
   * Quote an individual component of field name. Subclasses should override
   * this to define custom quoting.
   *
   * This is more intended to simplify the case of defining custom quoting in
   * subclasses and should not be used directly. Instead use
   * {@link Grammar#field}.
   *
   * @method
   * @public
   * @param {String} string The value to quote.
   * @return {String} A quoted value.
   */
  quote: function(string) {
    return '"' + string + '"';
  },

  /**
   * Escape value to be used directly in a query string.
   *
   * @method
   * @public
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
   * Quote a field name. The string may be qualified with the table name, in
   * which case it would use a dot to separate the field from the column. For
   * example, `articles.title` would refer to the `title` column of the
   * `articles` table.
   *
   * If your backed supports it, you can also create a plceholder with args and
   * return a fragment.
   *
   * @method
   * @public
   * @param {String} string The field name to escape.
   * @return {(String|Fragment)} The field name converted to a fragment and
   * converted as required.
   */
  field: function(field) {
    var quotable = field.split('.');
    var unquotable = [];
    if (_.last(quotable) === '*') {
      unquotable.push(quotable.pop());
    }
    var quoted = quotable.map(this.quote, this);
    return quoted.concat(unquotable).join('.');
  },

  /**
   * Quote a value or create a placeholder with args.
   *
   * @method
   * @public
   * @param {string} value A value to handle.
   * @return {(String|Fragment)} The value converted to a fragment and converted
   * as required.
   */
  value: function(value) {
    return Fragment.create('?', [value]);
  },

  /**
   * Create an expression given a predicate format string and replacement
   * values. Note that every value in the `replacements` could be a fragment,
   * so you'll need to be sure to account for that if you need to subclass this
   * method.
   *
   * @method
   * @public
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
      .pluck('args')
      .flatten().value();
    var string = util.format.apply(null, [predicate].concat(values));
    return [Fragment.create(string, args)];
  },

  /**
   * Determine the synatx for a binary operation. For instance, an operator
   * of `and` or `or` would be a binary operation.
   *
   * @method
   * @public
   * @param {Array.<String|Fragment>} lhs The left hand side of the operation.
   * @param {String} operator The operator of the operation.
   * @param {Array.<String|Fragment>} rhs The right hand side of the operation.
   * @return {Array.<String|Fragment>} An array of fragments.
   */
  operation: function(lhs, operator, rhs) {
    return [].concat(lhs, [' ', operator.toUpperCase(), ' '], rhs);
  },

  /**
   * Determine the synatx for a unary operation. For instance, an operator
   * of `not` would be a unary operation.
   *
   * @method
   * @public
   * @param {String} operator The operator of the operation.
   * @param {Array.<String|Fragment>} operand The operand of the operation.
   * @return {Array.<String|Fragment>} An array of fragments.
   */
  unary: function(operator, operand) {
    return [operator.toUpperCase(), ' '].concat(operand);
  },

  /**
   * Logically group an existing expression.
   *
   * @method
   * @public
   * @param {(String|Fragment)} expression The expression to group.
   * @return {Array.<String|Fragment>} An array of fragments.
   */
  group: function(expression) {
    return ['(', expression, ')'];
  },

  /**
   * Delimit (i.e. comma separate) an array of items.
   *
   * @method
   * @public
   * @param {Array.<String|Fragment>} items The items to delimit.
   * @return {Array.<String|Fragment>} An array of fragments.
   */
  delimit: function(items) {
    return items.reduce(function(array, item, index) {
      if (index !== 0) { array.push(', '); }
      array.push(item);
      return array;
    }, []);
  },

  /**
   * Join a set of fragments into a single fragment.
   *
   * @method
   * @public
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
