'use strict';

var Adapter = require('./base');

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
    _predicate: function(predicate) {
      var predicates = {
        'iexact': '%s LIKE %s',
        'contains': '%s LIKE BINARY %s',
        'icontains': '%s LIKE %s',
        'regex': '%s REGEXP BINARY %s',
        'iregex': '%s REGEXP %s',
        'startswith': '%s LIKE BINARY %s',
        'endswith': '%s LIKE BINARY %s',
        'istartswith': '%s LIKE %s',
        'iendswith': '%s LIKE %s'
      };
      return predicates[predicate] ||
        this._super.apply(this, arguments);
    }
  }, { __name__: 'MySQLTranslator' })
});

module.exports = MySQLAdapter.reopenClass({ __name__: 'MySQLAdapter' });
