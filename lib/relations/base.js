'use strict';

var _ = require('lodash');
var Class = require('../util/class');
var RelationAttr = require('./relation_attr');
var property = require('../util/property').fn;
var inflection = require('../util/inflection');

_.str = require('underscore.string');

/**
 * The base relation class.
 *
 * @public
 * @constructor BaseRelation
 * @extends Class
 * @param {String} name The name of the relationship.
 * @param {Class} modelClass The model class on which this relationship is
 * being defined.
 * @param {Class} [relatedModel] The model class with which this relationship
 * is being associated. If not provided, the related model class will be
 * determined based on the given `name`.
 * @param {Object} [options] Options which will be stored & can be used by
 * subclasses.
 */
var BaseRelation = Class.extend(/** @lends BaseRelation# */ {
  init: function(/*name, modelClass, relatedModel, options*/) {
    var args = _.toArray(arguments);
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
   * The model class on which this relation is defined.
   *
   * @type {Class}
   * @public
   * @readonly
   */
  modelClass: property(),

  /**
   * The model class to which this relation is related.
   *
   * @type {Class}
   * @public
   * @readonly
   */
  relatedModelClass: property({ property: '_relatedModel' }),

  /**
   * Add an object to an association.
   *
   * This method must be implemented by relation subclasses.
   *
   * @method
   * @protected
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
   * @method
   * @protected
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
   * Pre-fetch all objects for a relation.
   *
   * Usually this will entail fetching objects from the database (in a single
   * query) and associating the resulting objects. Since the objects have just
   * been loaded from the database, you'll likely use the `{ attrs: false }`
   * option to {@link BaseRelation#associate} when associating, this will
   * ensure that the related objects are set, but that nothing is marked as
   * dirty.
   *
   * This method must be implemented by relation subclasses.
   *
   * @method
   * @protected
   * @param {Array.<Model>} instances The instances for which data should be
   * pre-fetched.
   */
  prefetch: function(/*instances*/) {
    throw new Error('The `prefetch` method must be implemented by subclass');
  },

  /**
   * Join support for a relation.
   *
   * This method must be implemented by relation subclasses. A duplicated query
   * must be returned (which will almost always be done by simply calling
   * `query.join`).
   *
   * @method
   * @protected
   * @param {ModelQuery} query The query from which to perform the join.
   * @return {ModelQuery} A new query that performs the appropriate join.
   */
  join: function(/*query*/) {
    throw new Error('The `join` method must be implemented by subclass');
  }

});

BaseRelation.reopen(/** @lends BaseRelation# */ {

  /**
   * Process template placeholders within the names of methods. For instance,
   * when a relation has a name of 'article', this method would result in the
   * following:
   *
   *     template('<singular>Id') // => 'articleId'
   *     template('<plural>Where') // => 'articlesWhere'
   *     template('save<Singluar>') // => 'saveArticle'
   *     template('save<Plural>') // => 'saveArticles'
   *
   * Subclasses can override this method to provide additional templating
   * capabilities.
   *
   * @method
   * @private
   * @param {String} string The string to process templates for.
   * @return {String} The templated string.
   */
  template: function(string) {
    var name = this._name;
    var singular = inflection.singularize(name);
    var plural = inflection.pluralize(singular);
    var singularCapitalized = _.str.capitalize(singular);
    var pluralCapitalized = _.str.capitalize(plural);
    return string
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
   * @method
   * @protected
   * @return {Object} A set of attributes.
   */
  methods: function() {
    var self = this;
    var methods = this.__identity__.methods;
    return _.transform(methods, function(result, method, key) {
      result[self.template(key)] = method(self);
    }, {});
  }

});

BaseRelation.reopenClass(/** @lends BaseRelation */ {

  /**
   * A helper for a getter that can be used with {@link BaseRelation#method}.
   *
   * @function BaseRelation~PropertyGetterHelper
   * @param {Model} instance The model instance on which to operate.
   */

  /**
   * A helper for a setter that can be used with {@link BaseRelation#method}.
   *
   * @function BaseRelation~PropertySetterHelper
   * @param {Model} instance The model instance on which to operate.
   * @param {Object} value The value to set.
   */

  /**
   * This is the same as {@link BaseRelation.method}, but for properties.
   *
   * @method
   * @protected
   * @param {String} [getterName] The name of the
   * {@link BaseRelation~PropertyGetterHelper} call on the relation.
   * @param {String} [setterName] The name of the
   * {@link BaseRelation~PropertySetterHelper} call on the relation.
   * @return {BaseRelation~MethodCallable}
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
   * A helper method that can be used with {@link BaseRelation#method}.
   *
   * @function BaseRelation~MethodHelper
   * @param {Model} instance The model instance on which to operate.
   * @param {...Object} [args] The arguments to the method.
   */

  /**
   * Convenience method for defining methods that should be available via
   * {@link BaseRelation#methods}.
   *
   * This allows methods to be defined on the relation rather than in-line in
   * the static `methods` member, making the code far more clear. The method
   * on the relation should conform to the rules set forth by
   * {@link BaseRelation~MethodHelper}, that is, the first argument will be the
   * model instance on which the method is operating, and the remaining
   * arguments will be any that were passed to the method.
   *
   * The example given in {@link BaseRelation#methods} could be re-implemented
   * using this helper as follows:
   *
   *     CustomRelation.reopen({
   *       get: function(instance) {
   *         return instance['_' + this._name];
   *       },
   *       set: function(instance, value) {
   *         instance['_' + this._name] = value;
   *       }
   *     });
   *     CustomRelation.reopenClass({
   *       methods: {
   *         'get<Singular>': BaseRelation.method('get'),
   *         'set<Singular>': BaseRelation.method('set')
   *       }
   *     });
   *
   * @method
   * @protected
   * @param {String} name The name of the {@link BaseRelation~MethodHelper} to
   * call on the relation.
   * @return {BaseRelation~MethodCallable}
   */
  method: function(name) {
    return function(relation) {
      return function() {
        var fn = relation[name];
        var args = _.toArray(arguments);
        return fn.apply(relation, [this].concat(args));
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
   * @method
   * @public
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
