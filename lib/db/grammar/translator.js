'use strict';

var _ = require('lodash');
var util = require('util');
var date = require('../../util/date');
var Class = require('../../util/class');
var PredicateRule = require('./predicate_rule');

_.str = require('underscore.string');


/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @constructor
 */
var Translator = Class.extend();

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
    this._predicatesForComparisons(p);
    this._predicatesForStringSearch(p);
    this._predicatesForStringBoundaries(p);
    this._predicatesForDates(p);
    this._predicatesForTimes(p);
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
    p('exact').match(/^(?:exact|eql)$/i).using('%s = %s');
    p('iexact').match(/^i(?:exact|eql)$/i).using('UPPER(%s) = UPPER(%s)');
    p('in').match(/^in$/i).using('%s IN (%@)').expands();
    p('between').match(/^between$/i)
      .using('%s BETWEEN %s AND %s').expandsValue();
    p('isnull').match(/^(?:is)null$/i)
      .using('%s IS %s').value('isNull', 'literal');
  },

  /**
   * Define comparison predicates.
   *
   * @since 1.0
   * @private
   * @method
   * @param {Translator~PredicateCreator} p The predicate creator.
   */
  _predicatesForComparisons: function(p) {
    p('gt').match(/^gt$/i).using('%s > %s');
    p('gte').match(/^gte$/i).using('%s >= %s');
    p('lt').match(/^lt$/i).using('%s < %s');
    p('lte').match(/^lte$/i).using('%s <= %s');
  },

  /**
   * Define search string based predicates.
   *
   * @since 1.0
   * @private
   * @method
   * @param {Translator~PredicateCreator} p The predicate creator.
   */
  _predicatesForStringSearch: function(p) {
    p('contains').match(/^contains$/i).using('%s LIKE %s')
      .value('like', 'contains');
    p('icontains').match(/^icontains$/i).using('UPPER(%s) LIKE UPPER(%s)')
      .value('like', 'contains');
    p('regex').match(/^regex$/i).using('%s ~ %s')
      .value('regex');
    p('iregex').match(/^iregex$/i).using('%s ~* %s')
      .value('regex');
  },

  /**
   * Define boundary based string predicates.
   *
   * @since 1.0
   * @private
   * @method
   * @param {Translator~PredicateCreator} p The predicate creator.
   */
  _predicatesForStringBoundaries: function(p) {
    p('startsWith').match(/^startsWith$/i).using('%s LIKE %s')
      .value('like', 'startsWith');
    p('istartsWith').match(/^istartsWith$/i).using('UPPER(%s) LIKE UPPER(%s)')
      .value('like', 'startsWith');
    p('endsWith').match(/^endsWith$/i).using('%s LIKE %s')
      .value('like', 'endsWith');
    p('iendsWith').match(/^iendsWith$/i).using( 'UPPER(%s) LIKE UPPER(%s)')
      .value('like', 'endsWith');
  },

  /**
   * Define date based predicates.
   *
   * @since 1.0
   * @private
   * @method
   * @param {Translator~PredicateCreator} p The predicate creator.
   */
  _predicatesForDates: function(p) {
    p('year').match(/^year$/i).using('YEAR(%s) = %s');
    p('month').match(/^month$/i).using('MONTH(%s) = %s');
    p('day').match(/^day$/i).using('DAY(%s) = %s');
    p('weekday').match(/^weekday$/i).using('WEEKDAY(%s) = %s')
      .value(date.parseWeekdayToInt);
  },

  /**
   * Define time based predicates.
   *
   * @since 1.0
   * @private
   * @method
   * @param {Translator~PredicateCreator} p The predicate creator.
   */
  _predicatesForTimes: function(p) {
    p('hour').match(/^hour$/i).using('HOUR(%s) = %s');
    p('minute').match(/^minute$/i).using('MINUTE(%s) = %s');
    p('second').match(/^second$/i).using('SECOND(%s) = %s');
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
    var method = 'typeFor' + _.str.capitalize(type);
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
    return 'blob';
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
