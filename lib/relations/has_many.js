'use strict';

var _ = require('lodash');
var AttributeTrigger = require('../util/attribute_trigger');
var property = require('../util/property').fn;
var inflection = require('../util/inflection');

_.str = require('underscore.string');

var BoundQuery = require('../db/query/bound');

var HasManyRelationQuery = BoundQuery.extend();

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
    var tableName = this._relatedModel.tableName;
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
          objects.where(where)._spawn(HasManyRelationQuery, [tableName]);
      }
      return this[relationPrivate];
    });
    methods['create' + singularCapitalized] = function() {
      this[relation].create.apply(this, arguments);
    };
    methods['add' + singularCapitalized] =
    methods['add' + pluralCapitalized] = function() {
      this[relation].add.apply(this, arguments);
    };
    methods['remove' + singularCapitalized] =
    methods['remove' + pluralCapitalized] = function() {
      this[relation].remove.apply(this, arguments);
    };
    methods['clear' + pluralCapitalized] = function() {
      this[relation].clear.apply(this, arguments);
    };

    reopen(methods);
  }
});

module.exports = HasMany.reopenClass({ __name__: 'HasMany' });
