'use strict';

var _ = require('lodash');

/**
 * Inflection for morphing words.
 *
 * Note that all replacements are done in lowercase.
 *
 * @public
 * @constructor Inflection
 */
function Inflection() {
  this._plural = [];
  this._singular = [];
  this._uncountables = [];
}

/**
 * Define a rule for making a string plural. Each added rule will take
 * precedence over prior added rules.
 *
 * @method
 * @public
 * @param {RegExp|String} rule The rule.
 * @param {String} replacement The string to use to replace the contents.
 */
Inflection.prototype.plural = function(rule, replacement) {
  this._plural.unshift({
    regex: this._regex(rule),
    replacement: replacement
  });
};

/**
 * Define a rule for making a string singular. Each added rule will take
 * precedence over prior added rules.
 *
 * @method
 * @public
 * @param {RegExp|String} rule The rule.
 * @param {String} replacement The string to use to replace the contents.
 */
Inflection.prototype.singular = function(rule, replacement) {
  this._singular.unshift({
    regex: this._regex(rule),
    replacement: replacement
  });
};

/**
 * Define a rule for an irregular word. Each added rule will take precedence
 * over prior added rules.
 *
 * @method
 * @public
 * @param {String} singular The singular form of the word.
 * @param {String} plural The singular form of the word.
 */
Inflection.prototype.irregular = function(singular, plural) {
  this.plural('\\b' + singular + '\\b', plural);
  this.plural('\\b' + plural + '\\b', plural);
  this.singular('\\b' + singular + '\\b', singular);
  this.singular('\\b' + plural + '\\b', singular);
};

/**
 * Define a rule for an uncountable word. Each added rule will take precedence
 * over prior added rules.
 *
 * @method
 * @public
 * @param {...(String|Array)} word The word or words that are not countable.
 */
Inflection.prototype.uncountable = function(/*uncountable...*/) {
  var uncountables = _.flatten(arguments);
  this._uncountables = this._uncountables.concat(uncountables);
};

/**
 * Make a word singular.
 *
 * @method
 * @public
 * @param {String} word The word to make singular.
 */
Inflection.prototype.singularize = function(word) {
  return this._applyRules(word, this._singular);
};

/**
 * Make a word plural.
 *
 * @method
 * @public
 * @param {String} word The word to make plural.
 */
Inflection.prototype.pluralize = function(word) {
  return this._applyRules(word, this._plural);
};

/**
 * Create a regular expression.
 *
 * @method
 * @private
 * @param {String|RegExp} value The value to make into a RegExp.
 */
Inflection.prototype._regex = function(value) {
  return value instanceof RegExp ? value : new RegExp(value);
};

/**
 * Apply rules to a given word.
 *
 * @method
 * @private
 * @param {String} word The word to apply rules to.
 * @param {Array} rules The array of rules to search through to apply.
 */
Inflection.prototype._applyRules = function(word, rules) {
  var result = word;
  if (_.contains(this._uncountables, word)) { result = word; }
  else {
    var rule = _.find(rules, function(obj) {
      return obj.regex.test(word);
    });
    if (rule) {
      result = word.replace(rule.regex, rule.replacement);
    }
  }
  return result;
};

/**
 * The exported inflection object.
 *
 * The pre-defined rules are frozen to ensure that we don't break compatibility
 * with any applications that use them.
 *
 * @name Inflection~inflection
 * @type {Inflection}
 */
var inflection = new Inflection();

inflection.plural(/$/i, 's');
inflection.plural(/s$/i, 's');
inflection.plural(/^(ax|test)is$/i, '$1es');
inflection.plural(/(octop|vir)us$/i, '$1i');
inflection.plural(/(octop|vir)i$/i, '$1i');
inflection.plural(/(alias|status)$/i, '$1es');
inflection.plural(/(bu)s$/i, '$1ses');
inflection.plural(/(buffal|tomat)o$/i, '$1oes');
inflection.plural(/([ti])um$/i, '$1a');
inflection.plural(/([ti])a$/i, '$1a');
inflection.plural(/sis$/i, 'ses');
inflection.plural(/(?:([^f])fe|([lr])f)$/i, '$1$2ves');
inflection.plural(/(hive)$/i, '$1s');
inflection.plural(/([^aeiouy]|qu)y$/i, '$1ies');
inflection.plural(/(x|ch|ss|sh)$/i, '$1es');
inflection.plural(/(matr|vert|ind)(?:ix|ex)$/i, '$1ices');
inflection.plural(/^(m|l)ouse$/i, '$1ice');
inflection.plural(/^(m|l)ice$/i, '$1ice');
inflection.plural(/^(ox)$/i, '$1en');
inflection.plural(/^(oxen)$/i, '$1');
inflection.plural(/(quiz)$/i, '$1zes');

inflection.singular(/s$/i, '');
inflection.singular(/(ss)$/i, '$1');
inflection.singular(/(n)ews$/i, '$1ews');
inflection.singular(/([ti])a$/i, '$1um');
inflection.singular(/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)(sis|ses)$/i, '$1sis');
inflection.singular(/(^analy)(sis|ses)$/i, '$1sis');
inflection.singular(/([^f])ves$/i, '$1fe');
inflection.singular(/(hive)s$/i, '$1');
inflection.singular(/(tive)s$/i, '$1');
inflection.singular(/([lr])ves$/i, '$1f');
inflection.singular(/([^aeiouy]|qu)ies$/i, '$1y');
inflection.singular(/(s)eries$/i, '$1eries');
inflection.singular(/(m)ovies$/i, '$1ovie');
inflection.singular(/(x|ch|ss|sh)es$/i, '$1');
inflection.singular(/^(m|l)ice$/i, '$1ouse');
inflection.singular(/(bus)(es)?$/i, '$1');
inflection.singular(/(o)es$/i, '$1');
inflection.singular(/(shoe)s$/i, '$1');
inflection.singular(/(cris|test)(is|es)$/i, '$1is');
inflection.singular(/^(a)x[ie]s$/i, '$1xis');
inflection.singular(/(octop|vir)(us|i)$/i, '$1us');
inflection.singular(/(alias|status)(es)?$/i, '$1');
inflection.singular(/^(ox)en/i, '$1');
inflection.singular(/(vert|ind)ices$/i, '$1ex');
inflection.singular(/(matr)ices$/i, '$1ix');
inflection.singular(/(quiz)zes$/i, '$1');
inflection.singular(/(database)s$/i, '$1');

inflection.irregular('person', 'people');
inflection.irregular('man', 'men');
inflection.irregular('child', 'children');
inflection.irregular('sex', 'sexes');
inflection.irregular('move', 'moves');
inflection.irregular('zombie', 'zombies');

inflection.uncountable([
  'equipment', 'information', 'rice', 'money', 'species', 'series', 'fish',
  'sheep', 'jeans', 'police'
]);

module.exports = inflection;
module.exports.Inflection = Inflection;
