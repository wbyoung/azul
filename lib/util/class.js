'use strict';

var _ = require('lodash');
var util = require('util');
var construct = require('./construct');
var callable = require('./callable');

/**
 * The base metaclass constructor. The metaclass is used to build new classes.
 * The created classes can be used like normal classes, but they have an
 * associated metaclass prototype chain that makes them behave like objects
 * as well. For instance:
 *
 *     var Person = Class.extend();
 *     var Student = Class.extend();
 *
 *     var john = new Person();
 *     var susan = new Student();
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
 * The class object. This is an object that's also callable. It's basically an
 * identity for any class, for instance `Person.__class__ === Person`, however
 * it can be useful when implementing static methods. In that case,
 * `this.__class__` will return the class object on which the method was
 * called. This property is also available for instances of the created class.
 *
 * @name Class.__class__
 * @public
 * @since 1.0
 */

/**
 * The class used to create instances. This is slightly different from
 * {@link Class.\_\_class\_\_} in that it's not also an object, just a normal
 * function. This property is also available for instances of the created
 * class.
 *
 * @private
 * @name Class.__instanceclass__
 */

/**
 * The class used to create class objects. This property is also available for
 * instances of the created class.
 *
 * @private
 * @name Class.__metaclass__
 */

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
 * @since 1.0
 * @public
 * @method
 * @param {Object} properties Properties to add to the new class as members
 * accessible by instances.
 */
Meta.prototype.reopen = function(properties) {
  _.extend(this.__class__.prototype, properties);
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
 * @since 1.0
 * @public
 * @method
 * @param {Object} classProperties Properties to add to the new class as static
 * members accessible by class objects.
 */
Meta.prototype.reopenClass = function(classProperties) {
  _.extend(this.__metaclass__.prototype, classProperties);
};

/**
 * Create a new instance of the given class. Any arguments passed to this
 * method will be passed directly to the `init` method of the class (if one was
 * provided). This is the preferred way of creating a new instance of the
 * class, but using `new` will also work.
 *
 * @name Class.create
 * @since 1.0
 * @public
 * @method
 * @param {Object} [...arguments] Arguments to pass to the constructor.
 */
Meta.prototype.create = function() {
  return construct(this.__instanceclass__, arguments);
};

/**
 * This is basically an alias for {@link Class.create}, though it is the
 * support mechanism through which the use of `new` is supported. This method
 * is invoked by the `callable` function which is used to create new meta
 * classes.
 *
 * @private
 * @method
 */
Meta.prototype.call = function() {
  return this.create.apply(this, arguments);
};

/**
 * Initialize a new class object (meta class instance). This method is
 * responsible for ensuring the proper prototype chain setup for the callable
 * class object.
 *
 * @private
 * @method
 */
Meta.prototype._init = function() {
  // the prototype needs to be re-set here. this seems to be necessary for some
  // reason because of the type change on the callable object that's created.
  // if support were removed for defining class members via the standard
  // prototype channels, this would not be necessary. this also would not be
  // necessary if the class objects were not callable. since we want both of
  // those two features, it's required.
  this.prototype = this.__instanceclass__.prototype;
};

/**
 * Create a new class by extending an existing class. The classes are also
 * objects that have a similar inheritance pattern. This makes the following
 * possible:
 *
 *     var Person = Class.extend();
 *     var Student = Class.extend();
 *
 *     var john = new Person();
 *     var susan = new Student();
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
 * @since 1.0
 * @public
 * @method
 * @param {Object} [properties] Properties to add to the new class as members
 * accessible by instances.
 * @param {Object} [classProperties] Properties to add to the new class as
 * static members accessible by class objects.
 */
Meta.prototype.extend = function(properties, classProperties) {

  // parent lookups
  var ParentMeta = this.__metaclass__;
  var ParentClass =  this.__instanceclass__;
  var init = properties && properties.init;

  // class definition (used to create instance)
  var ChildClass = function() {
    if (!(this instanceof ChildClass)) { return construct(ChildClass, arguments); }
    ParentClass.apply(this, arguments);
    if (init) { return init.apply(this, arguments); }
  };
  ChildClass.prototype = Object.create(ParentClass.prototype);
  ChildClass.prototype.constructor = ChildClass;

  // meta class definition (used to create class object)
  var ChildMeta = callable(function() {});
  ChildMeta.prototype = Object.create(ParentMeta.prototype);
  ChildMeta.prototype.constructor = ChildMeta;
  ChildMeta.prototype.__metaclass__ = ChildMeta;
  ChildMeta.prototype.__instanceclass__ = ChildClass;

  // create class object & extend it
  var cls = new ChildMeta();
  cls._init();
  cls.reopenClass(classProperties);
  cls.reopenClass({
    __class__: cls
  });
  cls.reopen(properties);
  cls.reopen({
    __class__: cls,
    __metaclass__: ChildMeta,
    __instanceclass__: ChildClass
  });
  return cls;
};


/**
 * Define an accessor. This will define a property that reads and/or writes to
 * a private instance variable.
 *
 * @method Class.defineAccessor
 * @param {String} name The name of the accessor.
 * @param {Boolean} [options.readable=true] Whether the property is readable.
 * @param {Boolean} [options.writable=false] Whether the property is writable.
 */
Meta.prototype.defineAccessor = function(name, options) {
  var cls = this;
  var opts = _.defaults({}, options, {
    readable: true,
    writable: false,
    property: '_' + name
  });
  var property = opts.property;

  Object.defineProperty(cls.prototype, name, {
    enumerable: true,
    get: opts.readable ? function()  { return this[property]; } : undefined,
    set: opts.writable ? function(v) { this[property] = v; }    : undefined,
  });
};

/**
 * Inspect. Allows better debugging of classes. This functionality is also
 * available for instances of the created class. This method uses the
 * `__name__` class property to determine the name of the object/class.
 *
 * @name Class.inspect
 * @since 1.0
 * @public
 * @method
 */

/**
 * Alias of {@link Class.inspect}.
 *
 * @name Class.toString
 * @since 1.0
 * @public
 * @method
 * @see {@link Class.inspect}
 */
var inspect = function(suffix) {
  return util.format('[%s%s]', this.__class__.__name__ || 'Anonymous', suffix);
};
Meta.prototype.inspect =
Meta.prototype.toString = _.partial(inspect, ' Class');

/**
 * The base class object. Generally, you won't create new instances of this
 * class, but will instead use it to create new classes using
 * {@link Class.extend}.
 *
 * @since 1.0
 * @public
 * @constructor
 */
var Class = Meta.prototype.extend.call({
  __metaclass__: Meta,
  __instanceclass__: Object
}, {
  inspect: _.partial(inspect, ''),
  toString: _.partial(inspect, '')
}, {
  __name__: 'Class'
});

module.exports = Class;
