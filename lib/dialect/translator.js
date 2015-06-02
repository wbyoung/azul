'use strict';

var _ = require('lodash');
var util = require('util');
var date = require('../util/date');
var Class = require('corazon/class');
var PredicateRule = require('../types/predicate_rule');


/**
 * The translator is responsible for simple translations of very individual
 * pieces of a query. It does not deal with ordering of the components within
 * a query in any way.
 *
 * It has two major items that it's concerned with: predicates and types.
 *
 * The translator is responsible for taking a named predicate, and transforming
 * it into something that the database backed will be able to work with. Many
 * predicates will simply work out of the box for a specific adapter, but many
 * will need to be customized in order to be supported by the backend.
 * Subclasses should override {@link Translator#predicates} to handle this.
 *
 * @public
 * @constructor
 */
var Translator = Class.extend();

Translator.reopen(/** @lends Translator# */ {

  /**
   * Translate a predicate and the corresponding args into a format string and
   * arguments that can be used while creating expressions.
   *
   * @method
   * @public
   * @param {String} predicate The predicate to translate.
   * @return {{ format: String, args: Array }} A translated value.
   */
  predicate: function(predicate, args) {
    var match = _.find(this._allPredicates(), function(item) {
      return item.test(predicate);
    });
    if (!match) {
      throw new Error(util.format('Unsupported predicate: %s', predicate));
    }
    return match.expand(args);
  },

  /**
   * Get an array of all the predicate rules by calling
   * {@link Translator#predicates} with a predicate rule building function.
   *
   * @method
   * @private
   * @return {Array.<PredicateRule>} The predicates.
   */
  _allPredicates: function() {
    if (this._calculatedPredicates) { return this._calculatedPredicates; }

    // call the predicates function to actually build the list as the creator
    // function gets invoked.
    var all = {};
    var creator = function(name) {
      return (all[name] = all[name] || PredicateRule.create());
    };

    this.predicates(creator);
    this._calculatedPredicates = _.values(all);

    return this._calculatedPredicates;
  },

  /**
   * @callback Translator~PredicateCreator
   * @param {String} name The official name of the predicate.
   * @return {PredicateRule} The predicate rule to customize.
   */

  /**
   * Define predicates. Call _p_ with the official name for each predicate
   * definition you want to create. Subsequent calls will return the originally
   * created predicate rule allowing subclasses to customize/alter the rule.
   *
   * Standard predicate names are: `exact`, `iExact`, `contains`, `iContains`,
   * `startsWith`, `iStartsWith`, `endsWith`, `iEndsWith`, `regex`, `iRegex`,
   * `between`, `in`, `gt`, `gte`, `lt`, `lte`, `isNull`, `year`, `month`,
   * `day`, `hour`, `minute`, and `second`.
   *
   * Subclasses can also customize/alter the rule by overriding the specific
   * method for any of the standard predicates, but will have to override this
   * method in order to add additional predicates.
   *
   * @method
   * @public
   * @param {Translator~PredicateCreator} p The predicate creator.
   */
  predicates: function(p) {
    var list = [
      'exact', 'iExact',
      'contains', 'iContains',
      'startsWith', 'iStartsWith',
      'endsWith', 'iEndsWith',
      'regex', 'iRegex',
      'between', 'in',
      'gt', 'gte', 'lt', 'lte',
      'isNull',
      'year', 'month', 'day', 'weekday',
      'hour', 'minute', 'second'
    ];
    list.forEach(function(name) {
      var method = 'predicateFor' + _.capitalize(name);
      var obj = p(name);
      this[method](obj);
    }, this);
  },

  /**
   * Predicate configuration for `exact`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForExact: function(p) {
    return p.match(/^(?:exact|eql)$/i).using('%s = %s');
  },

  /**
   * Predicate configuration for `iExact`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForIExact: function(p) {
    return p.match(/^i(?:exact|eql)$/i).using('UPPER(%s) = UPPER(%s)');
  },

  /**
   * Predicate configuration for `in`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForIn: function(p) {
    return p.match(/^in$/i).using('%s IN (%@)').expands();
  },

  /**
   * Predicate configuration for `between`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForBetween: function(p) {
    return p.match(/^between$/i)
      .using('%s BETWEEN %s AND %s')
      .expandsValue();
  },

  /**
   * Predicate configuration for `isNull`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForIsNull: function(p) {
    return p.match(/^(?:is)null$/i)
      .using('%s IS %s')
      .value('isNull', 'literal');
  },

  /**
   * Predicate configuration for `gt`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForGt: function(p) {
    return p.match(/^gt$/i).using('%s > %s');
  },

  /**
   * Predicate configuration for `gte`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForGte: function(p) {
    return p.match(/^gte$/i).using('%s >= %s');
  },

  /**
   * Predicate configuration for `lt`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForLt: function(p) {
    return p.match(/^lt$/i).using('%s < %s');
  },

  /**
   * Predicate configuration for `lte`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForLte: function(p) {
    return p.match(/^lte$/i).using('%s <= %s');
  },

  /**
   * Predicate configuration for `contains`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForContains: function(p) {
    return p.match(/^contains$/i).using('%s LIKE %s')
      .value('like', 'contains');
  },

  /**
   * Predicate configuration for `iContains`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForIContains: function(p) {
    return p.match(/^icontains$/i).using('UPPER(%s) LIKE UPPER(%s)')
      .value('like', 'contains');
  },

  /**
   * Predicate configuration for `regex`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForRegex: function(p) {
    return p.match(/^regex$/i).using('%s ~ %s')
      .value('regex');
  },

  /**
   * Predicate configuration for `iRegex`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForIRegex: function(p) {
    return p.match(/^iregex$/i).using('%s ~* %s')
      .value('regex');
  },

  /**
   * Predicate configuration for `startsWith`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForStartsWith: function(p) {
    return p.match(/^startsWith$/i).using('%s LIKE %s')
      .value('like', 'startsWith');
  },

  /**
   * Predicate configuration for `iStartsWith`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForIStartsWith: function(p) {
    return p.match(/^istartsWith$/i).using('UPPER(%s) LIKE UPPER(%s)')
      .value('like', 'startsWith');
  },

  /**
   * Predicate configuration for `endsWith`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForEndsWith: function(p) {
    return p.match(/^endsWith$/i).using('%s LIKE %s')
      .value('like', 'endsWith');
  },

  /**
   * Predicate configuration for `iEndsWith`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForIEndsWith: function(p) {
    return p.match(/^iendsWith$/i).using( 'UPPER(%s) LIKE UPPER(%s)')
      .value('like', 'endsWith');
  },

  /**
   * Predicate configuration for `year`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForYear: function(p) {
    return p.match(/^year$/i).using('YEAR(%s) = %s');
  },

  /**
   * Predicate configuration for `month`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForMonth: function(p) {
    return p.match(/^month$/i).using('MONTH(%s) = %s');
  },

  /**
   * Predicate configuration for `day`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForDay: function(p) {
    return p.match(/^day$/i).using('DAY(%s) = %s');
  },

  /**
   * Predicate configuration for `weekday`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForWeekday: function(p) {
    return p.match(/^weekday$/i).using('WEEKDAY(%s) = %s')
      .value(date.parseWeekdayToInt);
  },

  /**
   * Predicate configuration for `hour`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForHour: function(p) {
    return p.match(/^hour$/i).using('HOUR(%s) = %s');
  },

  /**
   * Predicate configuration for `minute`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForMinute: function(p) {
    return p.match(/^minute$/i).using('MINUTE(%s) = %s');
  },

  /**
   * Predicate configuration for `second`.
   *
   * @method
   * @protected
   * @param {PredicateRule} p The predicate rule to configure.
   * @see {@link Translator#predicates}
   */
  predicateForSecond: function(p) {
    return p.match(/^second$/i).using('SECOND(%s) = %s');
  }
});

Translator.reopen(/** @lends Translator# */ {

  /**
   * Get the actual type that the adapter supports for one of the following
   * pre-defined types: `serial`, `integer`, `integer64`, `string`, `text`,
   * `binary`, `bool`, `date`, `time`, `dateTime`, or `float`.
   *
   * This method will call to convenience methods, `typeFor...` to determine
   * the type, so subclasses can override those to more easily customize types.
   *
   * @method
   * @public
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
   *
   * @method
   * @protected
   * @return {String} The database supported type.
   * @see {@link Translator#type}
   */
  typeForSerial: function() {
    return 'serial';
  },

  /**
   * Integer type for database backend.
   *
   * @method
   * @protected
   * @return {String} The database supported type.
   * @see {@link Translator#type}
   */
  typeForInteger: function() {
    return 'integer';
  },

  /**
   * 64 bit integer type for database backend.
   *
   * @method
   * @protected
   * @return {String} The database supported type.
   * @see {@link Translator#type}
   */
  typeForInteger64: function() {
    return 'bigint';
  },

  /**
   * String type for database backend.
   *
   * @method
   * @protected
   * @param {Object} [options] The options for the type.
   * @param {Number} [options.length] The maximum number of characters for the
   * string. Defaults to 255.
   * @return {String} The database supported type.
   * @see {@link Translator#type}
   */
  typeForString: function(options) {
    var opts = options || {};
    return util.format('varchar(%d)', opts.length || 255);
  },

  /**
   * Text type for database backend.
   *
   * @method
   * @protected
   * @return {String} The database supported type.
   * @see {@link Translator#type}
   */
  typeForText: function() {
    return 'text';
  },

  /**
   * Binary type for database backend.
   *
   * @method
   * @protected
   * @return {String} The database supported type.
   * @see {@link Translator#type}
   */
  typeForBinary: function() {
    return 'blob';
  },

  /**
   * Boolean type for database backend.
   *
   * @method
   * @protected
   * @return {String} The database supported type.
   * @see {@link Translator#type}
   */
  typeForBool: function() {
    return 'bool';
  },

  /**
   * Date type for database backend.
   *
   * @method
   * @protected
   * @return {String} The database supported type.
   * @see {@link Translator#type}
   */
  typeForDate: function() {
    return 'date';
  },

  /**
   * Time type for database backend.
   *
   * @method
   * @protected
   * @return {String} The database supported type.
   * @see {@link Translator#type}
   */
  typeForTime: function() {
    return 'time';
  },

  /**
   * Date-time type for database backend.
   *
   * @method
   * @protected
   * @return {String} The database supported type.
   * @see {@link Translator#type}
   */
  typeForDateTime: function() {
    return 'datetime';
  },

  /**
   * Float type for database backend.
   *
   * @method
   * @protected
   * @return {String} The database supported type.
   * @see {@link Translator#type}
   */
  typeForFloat: function() {
    return 'double precision';
  },

  /**
   * Decimal type for database backend.
   *
   * If using options, you must specify at least the precision. Different
   * adapters will handle options slightly differently. It is recommended
   * to either omit both the `precision` and the `scale` or provide both.
   *
   * @method
   * @protected
   * @param {Object} [options] The options for the type.
   * @param {Number} [options.precision] The precision for the decimal.
   * @param {Number} [options.scale] The scale for the decimal.
   * @return {String} The database supported type.
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
