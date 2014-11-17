'use strict';

var _ = require('lodash');
var AttributeTrigger = require('../util/attribute_trigger');
var property = require('../util/property').fn;
var inflection = require('../util/inflection');

_.str = require('underscore.string');

var BoundQuery = require('../db/query/bound');

var HasManyRelationQuery = BoundQuery.extend({
  clear: function() { return this.delete.apply(this, arguments); }
});
HasManyRelationQuery.reopenClass({ __name__: 'HasManyRelationQuery' });

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
  init: function(relatedModel, options) {
    this._relatedModel = relatedModel;
    this._options = options || {};
  },

  invoke: function(name, reopen/*, prototype*/) {
    var methods = {};
    var plural = name;
    var pluralCapitalized = _.str.capitalize(plural);
    var singular = inflection.singularize(name);
    var singularCapitalized = _.str.capitalize(singular);
    var objects = this._relatedModel.objects;
    var relation = singular + 'Objects';
    var relationPrivate = '_' + singular + 'Objects';
    var foreignKey = this._options.foreignKey;
    if (!foreignKey) {
      throw new Error('Not yet calculating foreign keys automatically');
    }
    var primaryKey = this._options.primaryKey;
    if (!primaryKey) {
      throw new Error('Not yet calculating primary keys automatically');
    }

    methods[plural] = property(function() {
      // TODO: make this a property that throws or has data in it
    });
    methods[relation] = property(function() {
      if (!this[relationPrivate]) {
        var where = {};
        where[foreignKey] = this[primaryKey];
        this[relationPrivate] =
          objects.where(where)._spawn(HasManyRelationQuery, []);
      }
      return this[relationPrivate];
    });
    methods['create' + singularCapitalized] = function() {
      return this[relation].create.apply(this[relation], arguments);
    };
    methods['add' + singularCapitalized] =
    methods['add' + pluralCapitalized] = function() {
      return this[relation].add.apply(this[relation], arguments);
    };
    methods['remove' + singularCapitalized] =
    methods['remove' + pluralCapitalized] = function() {
      return this[relation].remove.apply(this[relation], arguments);
    };
    methods['clear' + pluralCapitalized] = function() {
      return this[relation].clear.apply(this[relation], arguments);
    };

    reopen(methods);
  }
});

module.exports = HasMany.reopenClass({ __name__: 'HasMany' });
