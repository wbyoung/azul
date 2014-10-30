'use strict';

var _ = require('lodash');
var util = require('util');
var Class = require('../../util/class');
var LiteralString = require('../condition/literal');
var date = require('../../util/date');

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @constructor
 */
var Translator = Class.extend();

/**
 * Translate an individual argument to a literal. This is intended to be used
 * with {@link Translator.wrapValue}.
 *
 * @since 1.0
 * @public
 * @method Translator.literal
 * @param {String} value The value to transform.
 * @return {LiteralString} The literal string.
 */
var literal = LiteralString.create.bind(LiteralString);
Translator.reopenClass({ literal: literal });

/**
 * Translate an individual boolean argument into words representing a null
 * check. This is intended to be used with {@link Translator.wrapValue} and
 * {@link Translator.literal}.
 *
 * @since 1.0
 * @public
 * @method Translator.isNull
 * @param {Boolean} value The value to translate.
 * @return {String} The string `NULL` or `NOT NULL`.
 */
var isNull = function(value) {
  return value ? 'NULL' : 'NOT NULL';
};
Translator.reopenClass({ isNull: isNull });

/**
 * Wrap an individual argument with the proper _like_ characters to support
 * _contains_. This is intended to be used with {@link Translator.wrapValue}
 * and {@link Translator.like}.
 *
 * @since 1.0
 * @public
 * @method Translator.contains
 * @param {String} value The value to wrap.
 * @return {String} The wrapped value.
 */
var contains = _.partial(util.format, '%%%s%%');
Translator.reopenClass({ contains: contains });

/**
 * Wrap an individual argument with the proper _like_ characters to support
 * _startsWith_. This is intended to be used with {@link Translator.wrapValue}
 * and {@link Translator.like}.
 *
 * @since 1.0
 * @public
 * @method Translator.startsWith
 * @param {String} value The value to wrap.
 * @return {String} The wrapped value.
 */
var startsWith = _.partial(util.format, '%s%%');
Translator.reopenClass({ startsWith: startsWith });

/**
 * Wrap an individual argument with the proper _like_ characters to support
 * _endsWIth_. This is intended to be used with {@link Translator.wrapValue}
 * and {@link Translator.like}.
 *
 * @since 1.0
 * @public
 * @method Translator.endsWith
 * @param {String} value The value to wrap.
 * @return {String} The wrapped value.
 */
var endsWith = _.partial(util.format, '%%%s');
Translator.reopenClass({ endsWith: endsWith });

/**
 * Escape an individual argument to support use with _like_. This is intended
 * to be used with {@link Translator.wrapValue}.
 *
 * @since 1.0
 * @public
 * @method Translator.like
 * @param {String} value The value to escape.
 * @return {String} The escaped value.
 */
var like = function(value) {
  return value
    .replace('\\', '\\\\')
    .replace('%', '\\%')
    .replace('_', '\\_');
};
Translator.reopenClass({ like: like });

/**
 * Convert an individual argument that could be a `RegExp` into a string. This
 * is intended to be used with {@link Translator.wrapValue}.
 *
 * @since 1.0
 * @public
 * @method Translator.regex
 * @param {String|RegExp} value The value to convert.
 * @return {String} The string representation.
 */
var regex = function(value) {
  if (!(value instanceof RegExp)) { return value; }
  return value
    .toString()
    .replace(/^\//, '')
    .replace(/\/[gimy]*$/, '');
};
Translator.reopenClass({ regex: regex });

/**
 * Return a function that will alter arguments based on the provided wrapping
 * functions. This will only alter the _value_ argument, the argument at index
 * _1_ in the list of arguments.
 *
 * The given transformation functions will be applied to the value in the order
 * in which they are provided to this function.
 *
 * @since 1.0
 * @public
 * @method Translator.wrapValue
 * @param {...Function} fn The transformation to apply to the value argument.
 * @return {Translator~PredicateArgumentTransformer} The transformer function.
 */
var wrapValue = function(/*fn...*/) {
  var fns = Array.prototype.slice.call(arguments);
  var fn = _.compose.apply(null, fns.reverse());
  return function(args) {
    args = args.slice(0);
    args[1] = fn(args[1]);
    return args;
  };
};
Translator.reopenClass({ wrapValue: wrapValue });

/**
 * This is a {@link Translator~PredicateArgumentTransformer} that will expand
 * the _value_ argument, the argument at index _1_ in the list of arguments,
 * which must be an array. This allows format strings to easily specify
 * multiple placeholders and accept array values to fill those.
 *
 * @since 1.0
 * @public
 * @method Translator.expandArgs
 */
var expandArgs = function(args) {
  args = args.slice(0);
  return args.concat(args.pop());
};
Translator.reopenClass({ expandArgs: expandArgs });

Translator.reopen(/** @lends Translator# */{

  /**
   * Translate a predicate and the corresponding args into a format string and
   * arguments that can be used while creating expressions.
   *
   * @since 1.0
   * @public
   * @method
   * @param {String} predicate The predicate to translate.
   * @return {{ format: String, args: Array }} A translated value.
   */
  predicate: function(predicate, args) {
    var predicates = this._allPredicates();
    var match = _.find(predicates, function(item) {
      return item.regex.test(predicate);
    });
    if (!match) {
      throw new Error(util.format('Unsupported predicate: %s', predicate));
    }
    return {
      format: match.format,
      args: match.args ? match.args(args) : args
    };
  },

  /**
   * @typedef {Object} Translator~PredicateDefinition
   * @private
   * @property {String} format The format of the predicate.
   * @property {RegExp} regex The regex to match in order to use this
   * predicate definition.
   * @property {Translator~PredicateArgumentTransformer} args The argument
   * transformation function.
   */

  /**
   * Get an array of all the predicate definitions by calling
   * {@link Translator#predicates} with a predicate building function.
   *
   * @method
   * @private
   * @return {Array.<Translator~PredicateDefinition>} The predicates.
   */
  _allPredicates: function() {
    if (this._calculatedPredicates) { return this._calculatedPredicates; }

    var all = [];
    var predicateCreator = function() {
      var args = Array.prototype.slice.call(arguments);
      var name = args.shift();
      var regex = args[0] instanceof RegExp ? args.shift() : undefined;
      var format = args.shift();
      var argsTransformer = args.shift();
      var values = _.extend({}, {
        regex: regex,
        format: format,
        args: argsTransformer
      });
      _.merge(all, _.object([name], [values]));
    };

    // call the predicates function to actually build the list as the creator
    // function gets invoked.
    this.predicates(predicateCreator);

    return (this._calculatedPredicates = _.values(all));
  },

  /**
   * @callback Translator~PredicateArgumentTransformer
   * @param {Array} args The arguments to return.
   * @return {Array} A new array of arguments to use instead.
   */

  /**
   * @callback Translator~PredicateCreator
   * @param {String} name The official name of the predicate.
   * @param {RegExp} [regexp] The regular expression to match in order to use
   * this predicate.
   * @param {String} format The format for the resulting predicate.
   * @param {Translator~PredicateArgumentTransformer} args The argument
   * transformer for the resulting predicate.
   */

  /**
   * Define predicates. Call the _p_ for each predicate definition you want to
   * create. Subsequent calls will override previous definitions with the
   * supplied details (omitted values will not be cleared).
   *
   * While possible to omit the {@link Translator~PredicateArgumentTransformer}
   * when overriding pre-defined values, you should be aware that the base
   * class reserves the right to change format & argument transformers at any
   * time, so it is strongly suggested to always define them together.
   *
   * Standard predicate names are: `exact`, `iexact`, `contains`, `icontains`,
   * `startsWith`, `istartsWith`, `endsWith`, `iendsWith`, `regex`, `iregex`,
   * `between`, `in`, `gt`, `gte`, `lt`, `lte`, `isnull`, `year`, `month`,
   * `day`, `hour`, `minute`, and `second`.
   *
   * @since 1.0
   * @public
   * @method
   * @param {Translator~PredicateCreator} p The predicate creator.
   */
  predicates: function(p) {
    this._super.apply(this, arguments);

    // define the regexes for the names of each of the predicates
    (function(){})([
      p('exact', /^(?:exact|eql)$/i),
      p('iexact', /^i(?:exact|eql)$/i),
      p('contains', /^contains$/i),
      p('icontains', /^icontains$/i),
      p('startsWith', /^startsWith$/i),
      p('istartsWith', /^istartsWith$/i),
      p('endsWith', /^endsWith$/i),
      p('iendsWith', /^iendsWith$/i),
      p('regex', /^regex$/i),
      p('iregex', /^iregex$/i),
      p('between', /^between$/i),
      p('in', /^in$/i),
      p('gt', /^gt$/i),
      p('gte', /^gte$/i),
      p('lt', /^lt$/i),
      p('lte', /^lte$/i),
      p('isnull', /^(?:is)null$/i),
      p('year', /^year$/i),
      p('month', /^month$/i),
      p('day', /^day$/i),
      p('weekday', /^weekday$/i),
      p('hour', /^hour$/i),
      p('minute', /^minute$/i),
      p('second', /^second$/i)
    ]);

    // define the format and argument transforms for each predicate
    (function(){})([
      p('exact', '%s = %s'),
      p('iexact', 'UPPER(%s) = UPPER(%s)'),
      p('contains', '%s LIKE %s', wrapValue(like, contains)),
      p('icontains', 'UPPER(%s) LIKE UPPER(%s)', wrapValue(like, contains)),
      p('startsWith', '%s LIKE %s', wrapValue(like, startsWith)),
      p('istartsWith', 'UPPER(%s) LIKE UPPER(%s)', wrapValue(like, startsWith)),
      p('endsWith', '%s LIKE %s', wrapValue(like, endsWith)),
      p('iendsWith', 'UPPER(%s) LIKE UPPER(%s)', wrapValue(like, endsWith)),
      p('regex', '%s ~ %s', wrapValue(regex)),
      p('iregex', '%s ~* %s', wrapValue(regex)),
      p('between', '%s BETWEEN %s AND %s', expandArgs),
      p('in', '%s IN %s'),
      p('gt', '%s > %s'),
      p('gte', '%s >= %s'),
      p('lt', '%s < %s'),
      p('lte', '%s <= %s'),
      p('isnull', '%s IS %s', wrapValue(isNull, literal)),
      p('year', 'YEAR(%s) = %s'),
      p('month', 'MONTH(%s) = %s'),
      p('day', 'DAY(%s) = %s'),
      p('weekday', 'WEEKDAY(%s) = %s', wrapValue(date.parseWeekdayToInt)),
      p('hour', 'HOUR(%s) = %s'),
      p('minute', 'MINUTE(%s) = %s'),
      p('second', 'SECOND(%s) = %s')
    ]);
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   * @param {String} type The type to translate.
   * @param {Object} [options] The options associated with the type.
   * @return {String} A translated value.
   */
  type: function(type/*, options*/) {
    // TODO: handle more types & options
    var result;
    if (type === 'string') { result = 'varchar(255)'; }
    else if (type === 'text') { result = 'text'; }
    else if (type === 'serial') { result = 'serial'; }
    else if (type === 'integer') { result = 'int'; }
    else { throw new Error('Unhandled type ' + type); }
    return result;
  }
});

module.exports = Translator.reopenClass({ __name__: 'Translator' });
