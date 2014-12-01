'use strict';

var _ = require('lodash');
var Class = require('../util/class');
var RelationTrigger = require('./trigger');
var property = require('../util/property').fn;
var inflection = require('../util/inflection');

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
  init: function(name, modelClass) {
    this._name = name;
    this._modelClass = modelClass;
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @private
   * @method
   */
  template: function(key) {
    var name = this._name;
    var singular = inflection.singularize(name);
    var plural = inflection.pluralize(singular);
    var singularCapitalized = _.str.capitalize(singular);
    var pluralCapitalized = _.str.capitalize(plural);
    return key
      .replace('<singular>', singular)
      .replace('<Singular>', singularCapitalized)
      .replace('<plural>', plural)
      .replace('<Plural>', pluralCapitalized);
  },

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
    var methods = this.__identity__.methods;
    var names = _.reduce(methods, function(result, method, key) {
      result[key] = self.template(key); return result;
    }, {});
    return _.reduce(methods, function(result, method, key) {
      result[self.template(key)] = method(self, {
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
  property: function(getterName, setterName) {
    return function(relation) {
      var getter = getterName && function() {
        return relation[getterName](this);
      };
      var setter = setterName && function(value) {
        return relation[setterName](this, value);
      };
      return property(getter, setter);
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
