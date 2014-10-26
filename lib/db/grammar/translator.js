'use strict';

var _ = require('lodash');
var util = require('util');
var Class = require('../../util/class');
var date = require('../../util/date');

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @constructor
 */
var Translator = Class.extend(/** @lends Translator# */{

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   * @param {String} predicate The predicate to translate.
   * @return {String} A translated value.
   */
  predicate: function(predicate) {
    var result = this._predicate(predicate);
    if (!result) {
      throw new Error(util.format('Unsupported predicate: %s', predicate));
    }
    return result;
  },

  /**
   * Documentation forthcoming.
   *
   * This is the override point.
   *
   * @since 1.0
   * @public
   * @method
   * @param {String} predicate The predicate to translate.
   * @return {String} A translated value.
   */
  _predicate: function(predicate) {
    var predicates = {
      'exact': '%s = %s',
      'iexact': 'UPPER(%s) = UPPER(%s)',
      'contains': '%s LIKE %s',
      'icontains': 'UPPER(%s) LIKE UPPER(%s)',
      'startswith': '%s LIKE %s',
      'endswith': '%s LIKE %s',
      'istartswith': 'UPPER(%s) LIKE UPPER(%s)',
      'iendswith': 'UPPER(%s) LIKE UPPER(%s)',
      'regex': '%s ~ %s',
      'iregex': '%s ~* %s',
      'in': '%s IN %s',
      'gt': '%s > %s',
      'gte': '%s >= %s',
      'lt': '%s < %s',
      'lte': '%s <= %s',
      'isnull': '%s IS %s',
      'year': 'YEAR(%s) = %s',
      'month': 'MONTH(%s) = %s',
      'day': 'DAY(%s) = %s',
      'weekday': 'WEEKDAY(%s) =',
      'hour': 'HOUR(%s) = %s',
      'minute': 'MINUTE(%s) = %s',
      'second': 'SECOND(%s) = %s'
    };
    return predicates[predicate] ||
      this._super.apply(this, arguments);
  },

  /**
   * Transform a predicate value for an expression.
   *
   * The details type can be converted, if necessary, to `literal` which will
   * ensure that the value is not escaped further by the grammar during
   * condition building.
   *
   * @param {String} predicate The predicate.
   * @param {Object} details The details of the value (right hand side) of the
   * expression.
   * @param {String} details.type The type which will always be `value`.
   * @param {(String|Fragment)} details.value The value to transform.
   * @return {Object} The details transformed to the appropriate type.
   */
  expression: function(predicate, details) {
    return this._expression(predicate, details);
  },

  /**
   * Override point for the transformation of a predicate values for
   * expressions.
   *
   * Assumptions are built into the base class that certain predicates are
   * based around the transformations done here. For instance, a _contains_
   * predicate could be implemented with the SQL `column LIKE "%value%"` which
   * will dictate the transformations done here. If you create an custom
   * adapter, you should ensure that you override the `_expression` method when
   * you override the `_predicate`. While a best effort will be made to ensure
   * that this base class will not change the predicates or value
   * transformations, it also reserves the right to change the default
   * predicates and value transformations in future releases. If you are
   * building a custom adapter that will be widely used or you would prefer
   * that the base class values be set in stone, please create an issue to
   * discuss it.
   *
   * @see {@link Translator#expression}
   */
  _expression: function(predicate, details) {
    var value = details.value;

    // like based predicates need to be escaped
    if (predicate.match(/^i?(?:contains|startswith|endswith)$/)) {
      value = value
        .replace('\\', '\\\\')
        .replace('%', '\\%')
        .replace('_', '\\_');
    }

    if (predicate.match(/^isnull$/)) {
      details.type = 'literal';
      value = value ? 'NULL' : 'NOT NULL';
    }
    else if (predicate.match(/^i?contains$/)) {
      value = util.format('%%%s%%', value);
    }
    else if (predicate.match(/^i?startswith$/)) {
      value = util.format('%s%%', value);
    }
    else if (predicate.match(/^i?endswith$/)) {
      value = util.format('%%%s', value);
    }
    else if (predicate.match(/^i?regex$/) && value instanceof RegExp) {
      // convert regular expressions to strings
      // (and strip out any js regex options)
      value = value
        .toString()
        .replace(/^\//, '')
        .replace(/\/[gimy]*$/, '');
    }
    else if (predicate.match(/^weekday$/i)) {
      value = date.parseWeekdayToInt(value);
    }
    return _.extend(details, { value: value });
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
