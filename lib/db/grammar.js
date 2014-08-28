/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @constructor Adapter.Grammar
 */
function Grammar() {

};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Grammar.prototype.field = function(field) {
  var components = field.split('.');
  var quoted = components.map(function(part) {
    return '"' + part + '"';
  });
  return { string: quoted.join('.') };
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Grammar.prototype.value = function(value) {
  return {
    string: '?',
    extraction: value
  };
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Grammar.prototype.expression = function(lhs, predicate, rhs) {

  // TODO: this doesn't feel like it should be part of the grammar
  var predicates = {
    'exact': '=',
    'iexact': 'LIKE',
    'contains': 'LIKE BINARY',
    'icontains': 'LIKE',
    'regex': 'REGEXP BINARY',
    'iregex': 'REGEXP',
    'gt': '>',
    'gte': '>=',
    'lt': '<',
    'lte': '<=',
    'startswith': 'LIKE BINARY',
    'endswith': 'LIKE BINARY',
    'istartswith': 'LIKE',
    'iendswith': 'LIKE',
  };
  predicate = predicates[predicate];

  return { string: [lhs, predicate, rhs].join(' ') };
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Grammar.prototype.compound = function(lhs, operator, rhs) {
  return { string: [lhs, operator, rhs].join(' ') };
};

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @method
 */
Grammar.create = function(fns) {
  var SubGrammar;

  SubGrammar = function() { Grammar.apply(this, arguments); }
  SubGrammar.prototype = Object.create(Grammar.prototype);
  SubGrammar.prototype.constructor = SubGrammar;

  Object.keys(fns).forEach(function(key) {
    SubGrammar.prototype[key] = fns[key];
  });

  return SubGrammar;
};

module.exports = Grammar;
