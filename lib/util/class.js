'use strict';

var _ = require('lodash');
var util = require('util');
var construct = require('./construct');
var setPrototypeOf = require('./set-prototype-of');

/**
 * The base metaclass constructor. The metaclass is used to build new classes.
 * The created classes can be used like normal classes, but they have an
 * associated metaclass prototype chain that makes them behave like objects
 * as well. For instance:
 *
 *   var Person = Class.extend();
 *   var Student = Class.extend();
 *
 *   var john = new Person();
 *   var susan = new Student();
 *
 * In this example, `john` is an instance of the `Person` class and `susan`
 * is an instance of the `Student` class. This is nothing new. The metaclasses,
 * however allow static methods:
 *
 *   Person.prototype.staticMethod = function() {};
 *   Student.staticMethod();
 *
 * These static methods are usually defined using {@link Class.reopenClass}.
 *
 * @private
 * @constructor
 */
var Meta = function() {};
Meta.prototype = Object.create(Function.prototype);
Meta.prototype.constructor = Meta;

/**
 * Documentation forthcoming.
 *
 * @name Class.reopen
 * @since 1.0
 * @public
 * @method
 * @param {Object} properties Properties to add to the new class's prototype.
 */
Meta.prototype.reopen = function(properties) {
  _.extend(this.__class__.prototype, properties);
};


/**
 * Documentation forthcoming.
 *
 * @name Class.reopenClass
 * @since 1.0
 * @public
 * @method
 * @param {Object} properties Properties to add to the new metaclass's
 * prototype.
 */
Meta.prototype.reopenClass = function(properties) {
  _.extend(this.__metaclass__.prototype, properties);
};

/**
 * Documentation forthcoming.
 *
 * @name Class.create
 * @since 1.0
 * @public
 * @method
 * @param {Object} [...arguments] Arguments to pass to the constructor.
 */
Meta.prototype.create = function() {
  return construct(this.__class__, arguments);
};

/**
 * Documentation forthcoming.
 *
 * @name Class.extend
 * @since 1.0
 * @public
 * @method
 * @param {Object} [properties] Properties to add to the new class's prototype.
 * @param {Object} [classProperties] Properties to add to the new metaclass's
 * prototype.
 */
Meta.prototype.extend = function(properties, classProperties) {

  // parent lookups
  var ParentMeta = this.__metaclass__;
  var ParentClass = this.__class__;
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
  var ChildMeta = function() {
    var callable = function() { return construct(ChildClass, arguments); };
    setPrototypeOf(callable, ChildMeta.prototype);
    callable.prototype = ChildClass.prototype;
    return callable;
  };
  ChildMeta.prototype = Object.create(ParentMeta.prototype);
  ChildMeta.prototype.constructor = ChildMeta;
  ChildMeta.prototype.__metaclass__ = ChildMeta;
  ChildMeta.prototype.__class__ = ChildClass;

  // create class object & extend it
  var cls = new ChildMeta();
  cls.reopenClass(classProperties);
  cls.reopen(properties);
  cls.reopen({
    __metaclass__: ChildMeta,
    __class__: cls
  });
  return cls;
};


/**
 * Define an accessor. This will define a property that reads and/or writes to
 * a private instance variable.
 *
 * @name Class.defineAccessor
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
Meta.prototype.inspect =
Meta.prototype.toString = function() {
  return util.format('[%s Class]', this.__name__ || 'Anonymous');
};

/**
 * The base class object.
 */
var Class = Meta.prototype.extend.call({
  __metaclass__: Meta,
  __class__: Object
});

Class.prototype.inspect =
Class.prototype.toString = function() {
  return util.format('[%s]', this.__class__.__name__ || 'Anonymous');
};

module.exports = Class;
