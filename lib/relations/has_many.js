'use strict';

var _ = require('lodash');
var AttributeTrigger = require('../util/attribute_trigger');
var property = require('../util/property').fn;
var inflection = require('../util/inflection');

_.str = require('underscore.string');

var BoundQuery = require('../db/query/bound');

var HasManyRelationQuery = BoundQuery.extend({
  _create: function(model, relatedModel, options) {
    this._super();
    this._model = model;
    this._relatedModel = relatedModel;
    this._options = options;
  },

  _take: function(orig) {
    this._super(orig);
    this._model = orig._model;
    this._relatedModel = orig._relatedModel;
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   */
  add: function() {
    var self = this;
    var options = this._options;
    var foreignKeyProperty = _.str.camelize(options.foreignKey);
    var inverse = options.inverse;
    var additions = _.flatten(Array.prototype.slice.call(arguments), true);
    var ids = _.map(additions, 'id');

    var updates = {};
    updates[options.foreignKey] = this._model.id;
    var conditions = {};
    if (ids.length === 1) { conditions.id = ids[0]; }
    else { conditions['id[in]'] = ids; }

    var query = this._relatedModel.objects;
    return query.where(conditions).update(updates).on('result', function() {
      additions.forEach(function(addition) {
        addition[foreignKeyProperty] = self._model.id;
        addition[inverse] = self._model;
      });
    });
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   */
  remove: function() {
    var self = this;
    var options = this._options;
    var foreignKeyProperty = _.str.camelize(options.foreignKey);
    var inverse = options.inverse;
    var additions = _.flatten(Array.prototype.slice.call(arguments), true);
    var ids = _.map(additions, 'id');

    var updates = {};
    updates[options.foreignKey] = undefined;
    var conditions = {};
    if (ids.length === 1) { conditions.id = ids[0]; }
    else { conditions['id[in]'] = ids; }

    var query = this._relatedModel.objects;
    return query.where(conditions).update(updates).on('result', function() {
      additions.forEach(function(addition) {
        delete addition[foreignKeyProperty];
        delete addition[inverse];
      });
    });
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   */
   create: function() {
    var options = this._options;
    var foreignKeyProperty = _.str.camelize(options.foreignKey);
    var inverse = options.inverse;
    var modelClass = this._relatedModel;
    var result = modelClass.create.apply(modelClass, arguments);
    result[foreignKeyProperty] = this._model.id;
    result[inverse] = this._model;
    return result;
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   */
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

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   */
  invoke: function(name, reopen/*, prototype*/) {
    var methods = {};
    var plural = name;
    var pluralCapitalized = _.str.capitalize(plural);
    var singular = inflection.singularize(name);
    var singularCapitalized = _.str.capitalize(singular);
    var relatedModel = this._relatedModel;
    var objects = relatedModel.objects;
    var relation = singular + 'Objects';
    var relationPrivate = '_' + singular + 'Objects';
    var options = this._options;
    var foreignKey = options.foreignKey;
    if (!foreignKey) {
      throw new Error('Not yet calculating foreign keys automatically');
    }
    var primaryKey = this._options.primaryKey;
    if (!primaryKey) {
      throw new Error('Not yet calculating primary keys automatically');
    }
    var inverse = this._options.inverse;
    if (!inverse) {
      throw new Error('Not yet calculating inverse automatically');
    }

    methods[plural] = property(function() {
      // TODO: make this a property that throws or has data in it
    });
    methods[relation] = property(function() {
      if (!this[relationPrivate]) {
        var where = {};
        where[foreignKey] = this[primaryKey];
        // TODO: remove use of private method
        this[relationPrivate] =
          objects.where(where)._spawn(HasManyRelationQuery,
            [this, relatedModel, options]);
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
