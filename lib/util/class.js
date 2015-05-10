'use strict';

var _ = require('lodash');
var util = require('util');

/**
 * The base metaclass constructor. The metaclass is used to build new classes.
 * The created classes can be used like normal classes, but they have an
 * associated metaclass prototype chain that makes them behave like objects
 * as well. For instance:
 *
 *     var Person = Class.extend();
 *     var Student = Class.extend();
 *
 *     var john = Person.create();
 *     var susan = Student.create();
 *
 * In this example, `john` is an instance of the `Person` class and `susan`
 * is an instance of the `Student` class. This is nothing new. The metaclasses,
 * however allow static methods:
 *
 *     Person.prototype.staticMethod = function() {};
 *     Student.staticMethod();
 *
 * These static methods are usually defined using {@link Class.reopenClass}.
 *
 * @private
 * @function Class~Meta
 */
var Meta = function() {};

Meta.prototype = Object.create(Function.prototype);
Meta.prototype.constructor = Meta;

/**
 * The identity class object. It's a basic identity property for any class. For
 * instance `Person.__identity__ === Person`, however it can be useful when
 * implementing static methods. In that case, `this.__identity__` will return
 * the class object on which the method was called. This property is also
 * available for instances of the created class.
 *
 * @name Class.__identity__
 * @public
 */

/**
 * The super class object. This object is similar to
 * {@link Class.\_\_identity\_\_}, but gets the parent class object rather than
 * the current one. This property is also available for instances of the
 * created class.
 *
 * @name Class.__super__
 * @public
 */

/**
 * The constructor used to create instances. This is different from
 * {@link Class.\_\_identity\_\_} in that it's not the class object, just a
 * normal function/constructor. This property is also available for instances
 * of the created class.
 *
 * @name Class.__class__
 * @public
 */

/**
 * The class used to create class objects. This property is also available for
 * instances of the created class.
 *
 * @private
 * @name Class.__metaclass__
 */

/**
 * The underlying constructor for the instances of a class object. This type is
 * only used internally for clarifying documentation.
 *
 * @typedef {Function} ClassConstructor
 * @private
 */

/**
 * The underlying constructor for a class object. This type is only used
 * internally for clarifying documentation.
 *
 * @typedef {Function} MetaClassConstructor
 * @private
 */

/**
 * Mixin support is fully contained inside of the {@link Mixin} class, and
 * monkey-patches a few class methods.
 *
 * @name Class~MixinSupport
 * @private
 * @see {@link Mixin~ClassPatching}
 */

var wrap = { super: {} };

/**
 * Wrap a function so it supports calling a super function.
 *
 * @name wrap.super.fn
 * @private
 * @param {Function} fn The function to wrap.
 * @param {Function} superFunction The super function that the wrapper
 * should call.
 * @return {Function} The wrapped function.
 */
wrap.super.fn = function(fn, superFunction) {
  var wrapper = function _superable() {
    var result;
    if (this) {
      var currentSuper = this.__superFunction;
      this.__superFunction = superFunction;
      result = fn.apply(this, arguments);
      this.__superFunction = currentSuper;
      if (currentSuper === undefined) {
        delete this.__superFunction;
      }
    }
    else { result = fn.apply(this, arguments); }
    return result;
  };
  return _.extend(wrapper, fn, {
    superFunction: superFunction,
    wrappedFunction: fn,
  });
};

/**
 * Wrap any properties that are functions so they support calling a super
 * function.
 *
 * @name wrap.super.fn
 * @private
 * @param {Object} properties The properties to wrap.
 * @param {Object} superProperties The super properties used to look up super
 * functions.
 * @return {Object} The original properties with any functions that can be
 * wrapped wrapped.
 */
wrap.super.properties = function(properties, superProperties) {
  return _.mapValues(properties, function(value, key) {
    if (typeof value === 'function') {
      value = wrap.super.fn(value, superProperties[key]);
    }
    return value;
  }, this);
};

/**
 * Generic reopen to use for both instance and static methods.
 *
 * @name Class~reopen
 * @param {Object} properties The properties to add.
 * @param {ClassConstructor} cls The class to add properties to.
 * @param {ClassConstructor} superClass The class's super class.
 * @param {Object} [options]
 * @param {Boolean} [options.wrap=true] Whether to wrap the properties.
 */
var reopen = function(properties, cls, superClass, options) {
  var opts = _.defaults({}, options, { wrap: true });
  if (opts.wrap) {
    var prototype = cls.prototype;
    if (superClass) {
      // combine the cls prototype with the superClass prototype, but do so
      // using a new prototype chain to avoid copying (and invoking accessor
      // methods) either prototype. the combined prototype can be used to wrap
      // properties.
      prototype = Object.create(prototype);
      prototype.prototype = superClass.prototype;
    }
    properties = wrap.super.properties(properties, prototype);
  }
  _.extend(cls.prototype, properties);
};

/**
 * Add new members to a class. This method is used to add new methods to a
 * class after it has been created. For instance:
 *
 *     var Person = Class.extend();
 *
 *     Person.reopen({
 *       firstName: function() {
 *         return this.firstName + ' ' + this.lastName;
 *       }
 *     });
 *
 * @name Class.reopen
 * @method
 * @public
 * @param {Object} properties Properties to add to the new class as members
 * accessible by instances.
 */
Meta.prototype.reopen = function(properties, options) {
  reopen(properties, this.__class__,
    this.__super__ && this.__super__.__class__, options);
  return this;
};

/**
 * Add new static members to a class. This method is used to add new methods to a
 * class after it has been created. For instance:
 *
 *     var Person = Class.extend();
 *
 *     Person.reopenClass({
 *       findByName: function(firstName, lastName) {
 *         // somehow find a person by first/last name
 *       }
 *     });
 *
 *     var person = Person.findByName('Whitney', 'Young');
 *
 * These static members are available on classes that are created as extensions
 * of the given class as well.
 *
 * @name Class.reopenClass
 * @method
 * @public
 * @param {Object} classProperties Properties to add to the new class as static
 * members accessible by class objects.
 */
Meta.prototype.reopenClass = function(classProperties, options) {
  reopen(classProperties, this.__metaclass__,
    this.__super__ && this.__super__.__metaclass__, options);
  return this;
};

/**
 * Create a new instance of the given class. Any arguments passed to this
 * method will be passed directly to the `init` method of the class (if one was
 * provided).
 *
 * @name Class.create
 * @method
 * @public
 * @param {Object} [...arguments] Arguments to pass to the constructor.
 */
Meta.prototype.create = function() {
  return this._initialize(new this.__class__(), arguments, { init: true });
};

/**
 * Create a new, uninitialized instance of the given class.
 *
 * @name Class.new
 * @method
 * @public
 * @param {Object} [...arguments] Arguments to pass to the constructor.
 */
Meta.prototype.new = function() {
  return this._initialize(new this.__class__(), arguments);
};


/**
 * This method performs the proper initialization sequence for an object based
 * on its class hierarchy.
 *
 * @name Class._initialize
 * @method
 * @private
 * @param {Object} instance The instance.
 * @param {Array} args Initialization arguments.
 * @return {Object} The resulting instance (if it was changed).
 */
Meta.prototype._initialize = function(instance, args, options) {
  var opts = _.defaults({}, options, {
    init: false
  });
  instance = this.__super__ ?
    this.__super__._initialize(instance, args) : instance;
  var constructor = this.__class__.prototype.new;
  if (constructor) {
    instance = constructor.call(instance) || instance;
  }
  var init = opts.init && this.__class__.prototype.init;
  if (init) {
    instance = init.apply(instance, args) || instance;
  }
  return instance;
};

/**
 * Create a new class by extending an existing class. The classes are also
 * objects that have a similar inheritance pattern. This makes the following
 * possible:
 *
 *     var Person = Class.extend();
 *     var Student = Class.extend();
 *
 *     var john = Person.create();
 *     var susan = Student.create();
 *
 * In this example, `john` is an instance of the `Person` class and `susan`
 * is an instance of the `Student` class. This is nothing new. You can also
 * define static methods, though, through `classProperties` or by using
 * {@link Class.reopenClass}:
 *
 *     Person.reopenClass({
 *       staticMethod: function() {}
 *     });
 *     Student.staticMethod(); // callable on class extended from `Person`
 *
 * @name Class.extend
 * @method
 * @public
 * @param {Mixin} [...mixin] Mixin to use.
 * @param {Object} [properties] Properties to add to the new class as members
 * accessible by instances.
 * @param {Object} [classProperties] Properties to add to the new class as
 * static members accessible by class objects.
 */
Meta.prototype.extend = function(properties, classProperties) {

  // parent lookups
  var ParentMeta = this.__metaclass__;
  var ParentClass =  this.__class__;
  var superClass = this.__identity__; // the super class object

  // class definition (used to create instance)
  var ChildClass = function() {};
  ChildClass.prototype = Object.create(ParentClass.prototype);
  ChildClass.prototype.constructor = ChildClass;

  // meta class definition (used to create class object)
  var ChildMeta = function() {};
  ChildMeta.prototype = Object.create(ParentMeta.prototype);
  ChildMeta.prototype.constructor = ChildMeta;
  ChildMeta.prototype.__metaclass__ = ChildMeta;
  ChildMeta.prototype.__class__ = ChildClass;

  // create class object & extend it
  var cls = new ChildMeta();
  cls.reopenClass(classProperties);
  cls.reopenClass({
    __identity__: cls,
    __super__: superClass
  }, { wrap: false });
  cls.reopen(properties);
  cls.reopen({
    __identity__: cls,
    __super__: superClass,
    __class__: ChildClass,
    __metaclass__: ChildMeta
  }, { wrap: false });
  return cls;
};

/**
 * Call the superclass's version of the current method. This method is
 * available for both instance and static methods. It is pre-bound to the
 * current instance, so bind/call/apply cannot be used to set the value of
 * `this`.
 *
 * @name Class._super
 * @method
 * @public
 */
var _super = function() {
  var fn = this.__superFunction;
  var self = this;
  var bound = function _super() {
    if (this && this !== self) {
      throw new Error('_super cannot change `this` use _super.unbound');
    }
    return fn && fn.apply(self, arguments);
  };
  return _.extend(bound, { unbound: fn });
};

/**
 * Inspect. Allows better debugging of classes. This functionality is also
 * available for instances of the created class. This method uses the
 * `__name__` class property to determine the name of the object/class.
 *
 * @name Class.inspect
 * @method
 * @public
 */

/**
 * Alias of {@link Class.inspect}.
 *
 * @name Class.toString
 * @method
 * @public
 * @see {@link Class.inspect}
 */
var inspect = function(suffix) {
  return util.format('[%s%s]', this.__identity__.__name__, suffix);
};
Meta.prototype.inspect =
Meta.prototype.toString = _.partial(inspect, ' Class');

/**
 * The base class object. Generally, you won't create new instances of this
 * class, but will instead use it to create new classes using
 * {@link Class.extend}.
 *
 * @public
 * @constructor
 */
var Class = Meta.prototype.extend.call({
  __metaclass__: Meta,
  __class__: Object
}, {
  inspect: _.partial(inspect, ''),
  toString: _.partial(inspect, '')
}, {
  __name__: 'Class'
});

// add the _super method as a class and instance method (and ensure it's not
// wrapped). it's defined as a property to allow capturing (binding) of the
// super call before any asynchronous operations.
[ Class.__metaclass__.prototype,
  Class.__class__.prototype
].forEach(function(proto) {
  Object.defineProperty(proto, '_super', {
    enumerable: false,
    get: _super
  });
});

module.exports = Class;
