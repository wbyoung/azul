'use strict';

var util = require('util');
var Class = require('../../util/class');

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
    // TODO: for contains, startswith, and endswith we need to replace value
    // with a value that includes percent signs at the appropriate places to
    // support like based queries.
    // we will also need to escape those values replacing
    //   \ with \\, % with \%, and _ with \_
    //   str.replace('\\', '\\\\').replace('%', '\%').replace('_', '\_')
    // it'd be good to do that in a unicode-safe way if possible. this does not
    // feel like the suitable place for that. a better place is probably in the
    // grammar class as it's mostly related to characters & symbols.
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
      'hour': 'HOUR(%s) = %s',
      'minute': 'MINUTE(%s) = %s',
      'second': 'SECOND(%s) = %s'
    };
    return predicates[predicate] ||
      this._super.apply(this, arguments);
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
