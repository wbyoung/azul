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
    var predicates = {
      'exact': '= %s',
      'iexact': 'LIKE %s',
      'contains': 'LIKE BINARY %s',
      'icontains': 'LIKE %s',
      'regex': 'REGEXP BINARY %s',
      'iregex': 'REGEXP %s',
      'gt': '> %s',
      'gte': '>= %s',
      'lt': '< %s',
      'lte': '<= %s',
      'startswith': 'LIKE BINARY %s',
      'endswith': 'LIKE BINARY %s',
      'istartswith': 'LIKE %s',
      'iendswith': 'LIKE %s'
    };
    var result = predicates[predicate];
    if (!result) {
      throw new Error(util.format('Unsupported predicate: %s', predicate));
    }
    return result;
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
    if (type === 'string') {
      result = 'varchar(255)';
    }
    return result;
  }
});

module.exports = Translator.reopenClass({ __name__: 'Translator' });
