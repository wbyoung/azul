'use strict';

var _ = require('lodash');
var util = require('util');

function Inflection() {
  this._plural = [];
  this._singular = [];
  this._uncountables = [];
}

Inflection.prototype.plural = function(rule, replacement) {
  this._plural.unshift({
    regex: this._regex(rule),
    replacement: replacement
  });
};

Inflection.prototype.singular = function(rule, replacement) {
  this._singular.unshift({
    regex: this._regex(rule),
    replacement: replacement
  });
};

Inflection.prototype.irregular = function(singular, plural) {
  this.plural('\\b' + singular + '\\b', plural);
  this.plural('\\b' + plural + '\\b', plural);
  this.singular('\\b' + singular + '\\b', singular);
  this.singular('\\b' + plural + '\\b', singular);
};

Inflection.prototype.uncountable = function(/*uncountable...*/) {
  var uncountables = _.flatten(Array.prototype.slice.call(arguments));
  this._uncountables = this._uncountables.concat(uncountables);
};

Inflection.prototype.singularize = function(word) {
  return this._applyRules(word, this._singular);
};

Inflection.prototype.pluralize = function(word) {
  return this._applyRules(word, this._plural);
};

Inflection.prototype._regex = function(value) {
  var isRegex = value instanceof RegExp;
  var pattern = isRegex ? value.source : value;
  var flags = 'i';
  if (isRegex) {
    flags = '';
    flags += value.ignoreCase ? 'i' : '';
  }
  return new RegExp(pattern, flags);
};

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
