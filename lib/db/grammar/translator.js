'use strict';

var _ = require('lodash'); _.mixin(require('underscore.string').exports());
var util = require('util');
var Class = require('../../util/class');
var LiteralString = require('./literal');
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
    this._predicatesGeneric(p);
    this._predicatesForStrings(p);
    this._predicaetesForDates(p);
  },

  /**
   * Define generic predicates.
   *
   * @since 1.0
   * @private
   * @method
   * @param {Translator~PredicateCreator} p The predicate creator.
   */
  _predicatesGeneric: function(p) {
    p('exact', /^(?:exact|eql)$/i, '%s = %s');
    p('iexact', /^i(?:exact|eql)$/i, 'UPPER(%s) = UPPER(%s)');
    p('in', /^in$/i, '%s IN %s');
    p('gt', /^gt$/i, '%s > %s');
    p('gte', /^gte$/i, '%s >= %s');
    p('lt', /^lt$/i, '%s < %s');
    p('lte', /^lte$/i, '%s <= %s');
    p('between', /^between$/i, '%s BETWEEN %s AND %s', expandArgs);
    p('isnull', /^(?:is)null$/i, '%s IS %s', wrapValue(isNull, literal));
  },

  /**
   * Define string based predicates.
   *
   * @since 1.0
   * @private
   * @method
   * @param {Translator~PredicateCreator} p The predicate creator.
   */
  _predicatesForStrings: function(p) {
    p('contains', /^contains$/i,
      '%s LIKE %s', wrapValue(like, contains));
    p('icontains', /^icontains$/i,
      'UPPER(%s) LIKE UPPER(%s)', wrapValue(like, contains));
    p('startsWith', /^startsWith$/i,
      '%s LIKE %s', wrapValue(like, startsWith));
    p('istartsWith', /^istartsWith$/i,
      'UPPER(%s) LIKE UPPER(%s)', wrapValue(like, startsWith));
    p('endsWith', /^endsWith$/i,
      '%s LIKE %s', wrapValue(like, endsWith));
    p('iendsWith', /^iendsWith$/i,
      'UPPER(%s) LIKE UPPER(%s)', wrapValue(like, endsWith));
    p('regex', /^regex$/i,
      '%s ~ %s', wrapValue(regex));
    p('iregex', /^iregex$/i,
      '%s ~* %s', wrapValue(regex));
  },

  /**
   * Define date based predicates.
   *
   * @since 1.0
   * @private
   * @method
   * @param {Translator~PredicateCreator} p The predicate creator.
   */
  _predicaetesForDates: function(p) {
    p('year', /^year$/i, 'YEAR(%s) = %s');
    p('month', /^month$/i, 'MONTH(%s) = %s');
    p('day', /^day$/i, 'DAY(%s) = %s');
    p('weekday', /^weekday$/i, 'WEEKDAY(%s) = %s',
      wrapValue(date.parseWeekdayToInt));
    p('hour', /^hour$/i, 'HOUR(%s) = %s');
    p('minute', /^minute$/i, 'MINUTE(%s) = %s');
    p('second', /^second$/i, 'SECOND(%s) = %s');
  }
});

Translator.reopen(/** @lends Translator# */{

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
  type: function(type, options) {
    var method = 'typeFor' + _.capitalize(type);
    if (!this[method]) {
      throw new Error('Unhandled type ' + type);
    }
    return this[method](options);
  },

  /**
   * Serial type for database backend.
   * @see {@link Translator#type}
   */
  typeForSerial: function() {
    return 'serial';
  },

  /**
   * Integer type for database backend.
   * @see {@link Translator#type}
   */
  typeForInteger: function() {
    return 'integer';
  },

  /**
   * 64 bit integer type for database backend.
   * @see {@link Translator#type}
   */
  typeForInteger64: function() {
    return 'bigint';
  },

  /**
   * String type for database backend.
   *
   * Documentation forthcoming.
   *
   * @see {@link Translator#type}
   */
  typeForString: function(options) {
    var opts = options || {};
    return util.format('varchar(%d)', opts.length || 255);
  },

  /**
   * Text type for database backend.
   * @see {@link Translator#type}
   */
  typeForText: function() {
    return 'text';
  },

  /**
   * Binary type for database backend.
   * @see {@link Translator#type}
   */
  typeForBinary: function() {
    return 'bytea';
  },

  /**
   * Boolean type for database backend.
   * @see {@link Translator#type}
   */
  typeForBool: function() {
    return 'bool';
  },

  /**
   * Date type for database backend.
   * @see {@link Translator#type}
   */
  typeForDate: function() {
    return 'date';
  },

  /**
   * Time type for database backend.
   * @see {@link Translator#type}
   */
  typeForTime: function() {
    return 'time';
  },

  /**
   * Date-time type for database backend.
   * @see {@link Translator#type}
   */
  typeForDateTime: function() {
    return 'datetime';
  },

  /**
   * Float type for database backend.
   * @see {@link Translator#type}
   */
  typeForFloat: function() {
    return 'double precision';
  },

  /**
   * Decimal type for database backend.
   *
   * Documentation forthcoming.
   *
   * @see {@link Translator#type}
   */
  typeForDecimal: function(options) {
    var opts = options || {};
    var precision = opts.precision; // total number of digits
    var scale = opts.scale; // total number of decimal places
    var result = 'numeric';
    if (precision !== undefined && scale !== undefined) {
      result = util.format('numeric(%d, %d)', precision, scale);
    }
    else if (precision !== undefined) {
      result = util.format('numeric(%d)', precision);
    }
    else if (scale !== undefined) {
      throw new Error('Must specify precision if specifying scale.');
    }
    return result;
  }

});

module.exports = Translator.reopenClass({ __name__: 'Translator' });
