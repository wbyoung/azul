'use strict';

var Adapter = require('./base');

var like = Adapter.Translator.like,
  contains = Adapter.Translator.contains,
  startsWith = Adapter.Translator.startsWith,
  endsWith = Adapter.Translator.endsWith,
  regex = Adapter.Translator.regex,
  wrapValue = Adapter.Translator.wrapValue;

/**
 * MySQL Adapter
 *
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @constructor
 * @extends Adapter
 */
var MySQLAdapter = Adapter.extend();

MySQLAdapter.reopenClass(/** @lends MySQLAdapter */ {

  Grammar: Adapter.Grammar.extend({
    quote: function(string) {
      return '`' + string + '`';
    }
  }, { __name__: 'MySQLGrammar' }),

  Translator: Adapter.Translator.extend({
    predicates: function(p) {
      this._super.apply(this, arguments);
      p('iexact', '%s LIKE %s');
      p('contains', '%s LIKE BINARY %s', wrapValue(like, contains));
      p('icontains', '%s LIKE %s', wrapValue(like, contains));
      p('startsWith', '%s LIKE BINARY %s', wrapValue(like, startsWith));
      p('istartsWith', '%s LIKE %s', wrapValue(like, startsWith));
      p('endsWith', '%s LIKE BINARY %s', wrapValue(like, endsWith));
      p('iendsWith', '%s LIKE %s', wrapValue(like, endsWith));
      p('regex', '%s REGEXP BINARY %s', wrapValue(regex));
      p('iregex', '%s REGEXP %s', wrapValue(regex));
    }
  }, { __name__: 'MySQLTranslator' })
});

module.exports = MySQLAdapter.reopenClass({ __name__: 'MySQLAdapter' });
