'use strict';

var _ = require('lodash');
var AttributeTrigger = require('../util/attribute_trigger');
var inflection = require('../util/inflection');

_.str = require('underscore.string');

/**
 * The has many property for models.
 *
 * Documentation forthcoming.
 *
 * For example:
 *
 *     var User = Model.extend({
 *       articles: hasMany('articles')
 *     });
 *
 * @since 1.0
 * @public
 * @constructor HasMany
 * @extends Property
 */
var HasMany = AttributeTrigger.extend({
  invoke: function(name, reopen/*, object*/) {
    var methods = {};
    var singular = inflection.singularize(name);
    var singularCapitalized = _.str.capitalize(singular);
    var plural = name;
    var pluralCapitalized = _.str.capitalize(plural);
    var relation = {}; // TODO: create relation (perhaps a query)

    // TODO: make this a property that throws or has data in it
    methods[plural + 'Relation'] = function() {};
    methods['create' + singularCapitalized] = function() {
      relation.create.apply(this, arguments);
    };
    methods['add' + singularCapitalized] =
    methods['add' + pluralCapitalized] = function() {
      relation.add.apply(this, arguments);
    };
    methods['remove' + singularCapitalized] =
    methods['remove' + pluralCapitalized] = function() {
      relation.remove.apply(this, arguments);
    };
    methods['clear' + pluralCapitalized] = function() {
      relation.clear.apply(this, arguments);
    };

    reopen(methods);
  }
});

module.exports = HasMany.reopenClass({ __name__: 'HasMany' });
