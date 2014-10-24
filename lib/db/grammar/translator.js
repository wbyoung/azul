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
    var predicates = {
      'exact': '%s = %s',
      'iexact': 'UPPER(%s) = UPPER(%s)',
      'contains': '%s LIKE %s',
      'icontains': 'UPPER(%s) LIKE UPPER(%s)',
      'regex': '%s ~ %s',
      'iregex': '%s ~* %s',
      'gt': '%s > %s',
      'gte': '%s >= %s',
      'lt': '%s < %s',
      'lte': '%s <= %s',
      'startswith': '%s LIKE %s',
      'endswith': '%s LIKE %s',
      'istartswith': 'UPPER(%s) LIKE UPPER(%s)',
      'iendswith': 'UPPER(%s) LIKE UPPER(%s)'
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
