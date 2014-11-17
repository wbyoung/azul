'use strict';

var _ = require('lodash');
var AttributeTrigger = require('../util/attribute_trigger');
var property = require('../util/property').fn;
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
  invoke: function(name, reopen/*, prototype*/) {
    var methods = {};
    var plural = name;
    var pluralCapitalized = _.str.capitalize(plural);
    var singular = inflection.singularize(name);
    var singularCapitalized = _.str.capitalize(singular);
    var relation = {}; // TODO: create relation (perhaps a query)

    methods[plural] = property(function() {
      // TODO: make this a property that throws or has data in it
    });
    methods[singular + 'Objects'] = function() {};
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
