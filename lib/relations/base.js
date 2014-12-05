'use strict';

var _ = require('lodash');
var Class = require('../util/class');
var RelationAttr = require('./relation_attr');
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
  init: function(/*name, modelClass, relatedModel, options*/) {
    var args = Array.prototype.slice.call(arguments);
    var name = args.shift();
    var modelClass = args.shift();
    var db = modelClass.db;
    var relatedModel;

    if (args[0] instanceof db.Model.__metaclass__) {
      relatedModel = args.shift();
    }
    else if (_.isString(args[0])) {
      relatedModel = db.model(args.shift());
    }
    else {
      relatedModel = db.model(inflection.singularize(name));
    }

    var options = args.shift();

    this._name = name;
    this._modelClass = modelClass;
    this._relatedModel = relatedModel;
    this._options = options || {};
  },

  /**
   * Add an object to an association.
   *
   * This method must be implemented by relation subclasses.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Model} relatedObject The object to add to the association.
   * @param {Object} [options] Options.
   * @param {Object} [options.follow] Continue associating through inverse
   * relationship. Defaults to true.
   * @param {Object} [options.attrs] Update database related attributes during
   * the association. Defaults to true. Set this option to false if you're
   * associating objects that have just been loaded from the database.
   */
  associate: function(/*instance, relatedObject, options*/) {
    throw new Error('The `associate` method must be implemented by subclass');
  },

  /**
   * Remove an object from an association.
   *
   * This method must be implemented by relation subclasses.
   *
   * @since 1.0
   * @protected
   * @method
   * @param {Model} instance The model instance on which to operate.
   * @param {Model} relatedObject The object to add to the association.
   * @param {Object} [options] Options.
   * @param {Object} [options.follow] Continue disassociating through inverse
   * relationship. Defaults to true.
   * @param {Object} [options.attrs] Update database related attributes during
   * the association. Defaults to true. This option is supported in order for
   * the options to compliment {@link BaseRelation#associate}, but does not
   * have a real use case.
   */
  disassociate: function(/*instance, relatedObject, options*/) {
    throw new Error('The `disassociate` method must be implemented by subclass');
  },

  /**
   * Documentation forthcoming.
   *
   * @since 1.0
   * @protected
   * @method
   */
  prefetch: function(/*instances*/) {
    throw new Error('The `prefetch` method must be implemented by subclass');
  }

});

BaseRelation.reopen(/** @lends BaseRelation# */ {


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
   * @function BaseRelation~MethodCallable
   * @param {BaseRelation} relation [description]
   * @return {Object|Function} A value that should be added
   */

  /**
   * Generate a set of attributes (usually just methods and properties) that
   * should be added for this relation.
   *
   * This uses the static property `methods` to generate the appropriate
   * methods. It is expected that `methods` be an object having keys
   * corresponding to the method name & values that are
   * {@link BaseRelation~MethodCallable} functions. The object will have
   * transformations applied & then returned.
   *
   * The keys will simply be passed through {@link BaseRelation#template}.
   * The result will be used as the key in the returned object.
   *
   * Each function will be called with the relation object as the only
   * argument. The result of that function call will be used as the value in
   * the returned object.
   *
   * For instance, you could define the static property `methods` like so which
   * would get a related object via a convenience method:
   *
   *     CustomRelation.reopenClass({
   *       methods: {
   *         'get<Singular>': function(relation) {
   *           return function() {
   *             return this['_' + relation._name];
   *           };
   *         },
   *         'set<Singular>': function(relation) {
   *           return function(value) {
   *             this['_' + relation._name] = value;
   *           };
   *         }
   *       }
   *     });
   *
   * When used in a class:
   *
   *     User.reopen({
   *       profile: customRelation()
   *     });
   *
   * You would then be able to use these methods on instances:
   *
   *     user.getProfile(); // user._profile
   *     user.setProfile(profile); // user._profile = profile
   *
   * For more convenient definition of {@link BaseRelation~MethodCallable}
   * functions, use {@link BaseRelation.property} and
   * {@link BaseRelation.method}.
   *
   * @since 1.0
   * @protected
   * @method
   * @return {Object} A set of attributes.
   */
  methods: function() {
    var self = this;
    var methods = this.__identity__.methods;
    return _.reduce(methods, function(result, method, key) {
      result[self.template(key)] = method(self);
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
  }

});

BaseRelation.reopenClass(/** @lends BaseRelation */ {

  /**
   * Generate a function that will be usable to define attributes with this
   * relation.
   *
   * This method allows the simple creation of attribute functions. For
   * instance:
   *
   *     var hasMany = HasMany.attr();
   *
   * The returned function essentially binds the creation of a
   * {@link RelationAttr}, locking in the class on which it's being called as
   * the type to use for the relation attribute. When you call the returned
   * function, the given arguments are used as the arguments for the relation
   * attribute.
   *
   * The above example code defines the `hasMany` function, which has the
   * `HasMany` relation locked in as the type. When `hasMany` is called, for
   * instance `hasMany(options)`, the arguments that are given to that function
   * will be passed to the {@link RelationAttr} constructor as the `args`.
   * These will eventually be given as additional arguments to the relation's
   * constructor, in this case `HasMany` would receive options as an argument.
   * If used in the context of a `User` having many `articles`, the exact
   * arguments to the `HasMany` constructor would be
   * `['articles', User, options]`. See {@link RelationAttr} for more details.
   *
   * @since 1.0
   * @public
   * @method
   * @return {Function}
   * @see {@link RelationAttr}
   */
  attr: function() {
    var self = this;
    return function() {
      return RelationAttr.create(self, arguments);
    };
  }

});

module.exports = BaseRelation.reopenClass({ __name__: 'BaseRelation' });
