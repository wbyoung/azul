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
 * @since 1.0
 */

/**
 * The super class object. This object is similar to
 * {@link Class.\_\_identity\_\_}, but gets the parent class object rather than
 * the current one. This property is also available for instances of the
 * created class.
 *
 * @name Class.__super__
 * @public
 * @since 1.0
 */

/**
 * The constructor used to create instances. This is different from
 * {@link Class.\_\_identity\_\_} in that it's not the class object, just a
 * normal function/constructor. This property is also available for instances
 * of the created class.
 *
 * @name Class.__class__
 * @public
 * @since 1.0
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
  _.extend(this.__class__.prototype, properties); return this;
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
  _.extend(this.__metaclass__.prototype, classProperties); return this;
};

/**
 * Create a new instance of the given class. Any arguments passed to this
 * method will be passed directly to the `init` method of the class (if one was
 * provided).
 *
 * @name Class.create
 * @since 1.0
 * @public
 * @method
 * @param {Object} [...arguments] Arguments to pass to the constructor.
 */
Meta.prototype.create = function() {
  return this._initialize(new this.__class__(), arguments);
};

/**
 * This method performs the proper initialization sequence for an object based
 * on its class hierarchy.
 *
 * @name Class._initialize
 * @private
 * @method
 * @param {Object} instance The instance.
 * @param {Array} args Initialization arguments.
 * @return {Object} The resulting instance (if it was changed).
 */
Meta.prototype._initialize = function(instance, args) {
  instance = this.__super__ ?
    this.__super__._initialize(instance, args) : instance;
  var init = this.__class__.prototype.init;
  return init ? init.apply(instance, args) || instance : instance;
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
  });
  cls.reopen(properties);
  cls.reopen({
    __identity__: cls,
    __super__: superClass,
    __class__: ChildClass,
    __metaclass__: ChildMeta
  });
  return cls;
};


/**
 * Define an accessor. This will define a property that reads and/or writes to
 * a private instance variable.
 *
 * @method Class.defineAccessor
 * @param {String} name The name of the accessor.
 * @param {Function} [getter] The getter to use (also sets `readable`).
 * @param {Function} [setter] The setter to use (also sets `readable`).
 * @param {Boolean} [options.readable=true] Whether the property is readable.
 * @param {Boolean} [options.writable=false] Whether the property is writable.
 */
Meta.prototype.defineAccessor = function() {
  var args = Array.prototype.slice.call(arguments);
  var name = args.shift();
  var get = typeof args[0] === 'function' ? args.shift() : undefined;
  var set = typeof args[0] === 'function' ? args.shift() : undefined;
  var options = args.shift();
  var opts = _.defaults({}, options, {
    readable: true,
    writable: false,
    property: '_' + name
  });
  var property = opts.property;

  if (!get && opts.readable) { get = function()  { return this[property]; }; }
  if (!set && opts.writable) { set = function(v) { this[property] = v; }; }

  Object.defineProperty(this.__class__.prototype, name, {
    enumerable: true,
    get: get,
    set: set,
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
  return util.format('[%s%s]', this.__identity__.__name__ || 'Anonymous', suffix);
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
  __class__: Object
}, {
  inspect: _.partial(inspect, ''),
  toString: _.partial(inspect, '')
}, {
  __name__: 'Class'
});

module.exports = Class;
