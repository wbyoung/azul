'use strict';

var util = require('util');
var Class = require('../../util/class');
var Fragment = require('./fragment');

var Translator = Class.extend();

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 * @param {String} predicate The predicate to translate.
 * @return {String} A translated value.
 */
Translator.prototype.predicate = function(predicate) {
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
  return predicates[predicate];
};

module.exports = Translator;
