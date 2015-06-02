'use strict';

var _ = require('lodash');
var util = require('util');
var Class = require('corazon/class');
var LiteralString = require('./literal');

/**
 * Predicate rules are used by custom adapters to define the structure of
 * predicates with respect both to their format and use of arguments.
 *
 * @protected
 * @constructor PredicateRule
 */
var PredicateRule = Class.extend(/** @lends PredicateRule# */ {
  init: function() {
    this._transforms = [];
  },

  /**
   * An object representing the format and argument combination that results
   * from the expansion of this rule.
   *
   * The expansion is passed to transformers and is ultimately the value that
   * is used as the result of the {@link PredicateRule#expand} process.
   *
   * Before being transformed/expanded, this object uses the format string as
   * defined by {@link PredicateRule#using} and the `args` that are given to
   * the {@link PredicateRule#expand} process. While `args` should be
   * considered an array of opaque values, the process will almost always start
   * with two arguments in this array, a _field_ and a _value_. Throughout the
   * `PredicateRule` documentation, when referring to the _value_ within
   * `args`, it refers to this object at index 1 within the array before it has
   * been further transformed.
   *
   * @typedef {Object} PredicateRule~Expansion
   * @property {String} format The value of the format string.
   * @property {Array} args The array of args .
   */

  /**
   * @callback PredicateRule~Transform
   * @param {PredicateRule~Expansion} expansion The value to transform.
   * @return {PredicateRule~Expansion} The updated value to use instead.
   */

  /**
   * Add a transform for this predicate rule. Multiple transforms can be added
   * and are processed in the sequence that they were added. Transforms will be
   * applied during {@link PredicateRule#expand}.
   *
   * @param {PredicateRule~Transform} transform The transform to add.
   * @return {PredicateRule} The predicate rule to allow chaining.
   */
  transform: function(transform) {
    this._transforms.push(transform);
    return this;
  },

  /**
   * Set the RegExp to use for this predicate rule.
   *
   * @param {RegExp} regex The regex.
   * @return {PredicateRule} The predicate rule to allow chaining.
   */
  match: function(regex) {
    this._regex = regex;
    return this;
  },

  /**
   * Set the format string for the predicate rule.
   *
   * @param {String} format The format.
   * @return {PredicateRule} The predicate rule to allow chaining.
   */
  using: function(format) {
    this._format = format;
    this._transforms.splice(0);
    return this;
  },

  /**
   * Test this rule to see if it should be used with a given predicate string.
   *
   * @param {string} predicate The predicate to test.
   * @return {PredicateRule} The predicate rule to allow chaining.
   */
  test: function(predicate) {
    return this._regex.test(predicate);
  },

  /**
   * Expand the predicate rule using a set of opaque arguments to craft both
   * the resulting format string and args.
   *
   * @param {Array} args An array of opaque values.
   * @return {PredicateRule~Expansion} The expanded format & args.
   * @see {@link PredicateRule~Expansion}
   */
  expand: function(args) {
    var result = { format: this._format, args: args };
    this._transforms.forEach(function(fn) {
      result = fn(result);
    });
    return result;
  },

  /**
   * Add a {@link PredicateRule~Transform} that will expand the
   * [value argument]{@link PredicateRule~Expansion}, which must be an array.
   * This allows format strings to easily specify multiple placeholders and
   * accept array values to fill those (i.e. `between`).
   *
   * @method
   * @public
   * @return {PredicateRule} The predicate rule to allow chaining.
   */
  expandsValue: function() {
    var fn = function(ex) {
      ex.args = ex.args.slice(0);
      ex.args = ex.args.concat(ex.args.pop());
      return ex;
    };
    return this.transform(fn);
  },

  /**
   * Add a {@link PredicateRule~Transform} that will expand the format string
   * and the [value argument]{@link PredicateRule~Expansion}, which must be an
   * array. In addition to expanding the value argument, it will replace the
   * first occurrence of `%@` in the format string with the comma separated
   * `%s` strings to match the number of items in the _value_ array. This
   * allows format strings to expand based on value arguments (i.e. to support
   * `in` and similar predicates).
   *
   * @method
   * @public
   * @return {PredicateRule} The predicate rule to allow chaining.
   */
  expands: function() {
    var fn = function(ex) {
      var args = ex.args;
      var length = args[1].length;
      var placeholders = _.times(length, function() { return '%s'; });
      ex.format = ex.format.replace('%@', placeholders.join(', '));
      return ex;
    };
    this.transform(fn);
    this.expandsValue();
    return this;
  },

  /**
   * Add a {@link PredicateRule~Transform} that will alter arguments based on
   * the provided wrapping functions. This will only alter the _value_
   * argument, the argument at index _1_ in the list of arguments.
   *
   * The given transformation functions will be applied to the value in the order
   * in which they are provided to this function.
   *
   * @method
   * @public
   * @param {...(Function|String)} fn The transformation to apply to the value
   * argument. If a string, the named function is looked up on the
   * {@link PredicateRule} class object.
   * @return {PredicateRule} The predicate rule to allow chaining.
   */
  value: function() {
    var fns = _.toArray(arguments).map(function(fn) {
      return _.isString(fn) ? PredicateRule[fn] : fn;
    });
    var composed = _.compose.apply(null, fns.reverse());
    var fn = function(ex) {
      ex.args = ex.args.slice(0);
      ex.args[1] = composed(ex.args[1]);
      return ex;
    };
    return this.transform(fn);
  }
});


PredicateRule.reopenClass(/** @lends PredicateRule */ {

  /**
   * Translate an individual argument to a literal. This is intended to be used
   * with {@link PredicateRule#value}.
   *
   * @method PredicateRule.literal
   * @public
   * @param {String} value The value to transform.
   * @return {LiteralString} The literal string.
   */
  literal: LiteralString.create.bind(LiteralString),

  /**
   * Translate an individual boolean argument into words representing a null
   * check. This is intended to be used with {@link PredicateRule#value} and
   * {@link PredicateRule.literal}.
   *
   * @method PredicateRule.isNull
   * @public
   * @param {Boolean} value The value to translate.
   * @return {String} The string `NULL` or `NOT NULL`.
   */
  isNull: function(value) {
    return value ? 'NULL' : 'NOT NULL';
  },

  /**
   * Wrap an individual argument with the proper _like_ characters to support
   * _contains_. This is intended to be used with {@link PredicateRule#value}
   * and {@link PredicateRule.like}.
   *
   * @method PredicateRule.contains
   * @public
   * @param {String} value The value to wrap.
   * @return {String} The wrapped value.
   */
  contains: _.partial(util.format, '%%%s%%'),

  /**
   * Wrap an individual argument with the proper _like_ characters to support
   * _startsWith_. This is intended to be used with {@link PredicateRule#value}
   * and {@link PredicateRule.like}.
   *
   * @method PredicateRule.startsWith
   * @public
   * @param {String} value The value to wrap.
   * @return {String} The wrapped value.
   */
  startsWith: _.partial(util.format, '%s%%'),

  /**
   * Wrap an individual argument with the proper _like_ characters to support
   * _endsWIth_. This is intended to be used with {@link PredicateRule#value}
   * and {@link PredicateRule.like}.
   *
   * @method PredicateRule.endsWith
   * @public
   * @param {String} value The value to wrap.
   * @return {String} The wrapped value.
   */
  endsWith: _.partial(util.format, '%%%s'),

  /**
   * Escape an individual argument to support use with _like_. This is intended
   * to be used with {@link PredicateRule#value}.
   *
   * @method PredicateRule.like
   * @public
   * @param {String} value The value to escape.
   * @return {String} The escaped value.
   */
  like: function(value) {
    return value
      .replace('\\', '\\\\')
      .replace('%', '\\%')
      .replace('_', '\\_');
  },

  /**
   * Convert an individual argument that could be a `RegExp` into a string. This
   * is intended to be used with {@link PredicateRule#value}.
   *
   * @method PredicateRule.regex
   * @public
   * @param {String|RegExp} value The value to convert.
   * @return {String} The string representation.
   */
  regex: function(value) {
    if (!(value instanceof RegExp)) { return value; }
    return value
      .toString()
      .replace(/^\//, '')
      .replace(/\/[gimy]*$/, '');
  }
});

module.exports = PredicateRule.reopenClass({ __name__: 'PredicateRule' });
