'use strict';

var _ = require('lodash');
var Class = require('../../util/class');
var RelationTrigger = require('./trigger');
var property = require('../../util/property').fn;
var inflection = require('../../util/inflection');

_.str = require('underscore.string');

/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @constructor BaseRelation
 * @extends Class
 */
var BaseRelation = Class.extend(/** @lends BaseRelation# */ {
  init: function(name) {
    this._name = name;
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @private
   * @method
   */
  _setup: function(/*instance*/) {},

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  methods: function() {
    var self = this;
    var name = this._name;
    var singular = inflection.singularize(name);
    var plural = inflection.pluralize(singular);
    var singularCapitalized = _.str.capitalize(singular);
    var pluralCapitalized = _.str.capitalize(plural);
    var methods = this.__identity__.methods;
    var template = function(key) {
      return key
        .replace('<singular>', singular)
        .replace('<Singular>', singularCapitalized)
        .replace('<plural>', plural)
        .replace('<Plural>', pluralCapitalized);
    };
    var names = _.reduce(methods, function(result, method, key) {
      result[key] = template(key); return result;
    }, {});
    return _.reduce(methods, function(result, method, key) {
      result[template(key)] = method(self, {
        name: name,
        names: names
      });
      return result;
    }, {});
  }
});

BaseRelation.reopenClass(/** @lends BaseRelation */ {

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  property: function(name) {
    return function(relation) {
      return property(function() {
        relation._setup(this);
        return relation[name](this);
      });
    };
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  cachedProperty: function(name) {
    return function(relation) {
      var cache = '_' + _.str.camelize(relation._name + '_' + name + '_cache');
      return property(function() {
        relation._setup(this);
        if (!this[cache]) {
          this[cache] = relation[name](this);
        }
        return this[cache];
      });
    };
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  method: function(name) {
    return function(relation) {
      return function() {
        relation._setup(this);
        return relation[name](this, arguments);
      };
    };
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @public
   * @method
   */
  attribute: function() {
    return _.partial(RelationTrigger.create.bind(RelationTrigger), this);
  }

});

module.exports = BaseRelation.reopenClass({ __name__: 'BaseRelation' });
