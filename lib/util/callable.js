'use strict';

var setPrototypeOf = require('./set-prototype-of');

/**
 * Create a new function (class) that will produce instances that can
 * themselves be called (like functions) but are still instances of that
 * class. When these instances are called, they will invoke a `call` method
 * which you must define on the class.
 *
 * For instance:
 *
 *     var Runner = callable(function() {
 *       this.message = 'running...';
 *     });
 *
 *     Runner.prototype.call = function() {
 *       console.log(this.message);
 *     };
 *
 *     var run = new Runner();
 *     run instanceof Runner; //=> true
 *     run(); //-> running...
 *
 * @function util.callable
 * @private
 * @param {Function} constructor The constructor for the new class.
 * @return {Function} A class that creates callable objects.
 */
module.exports = function(constructor) {
  var cls = function() {
    var obj = function() { return cls.prototype.call.apply(obj, arguments); };
    setPrototypeOf(obj, cls.prototype);
    constructor.apply(obj, arguments);
    return obj;
  };
  return cls;
};
