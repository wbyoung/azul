'use strict';

var setPrototypeOf = require('./set-prototype-of');

module.exports = function(fn) {
  var cls = function() {
    var obj = function() { return cls.prototype.__call__.apply(obj, arguments); };
    setPrototypeOf(obj, cls.prototype);
    fn.apply(obj, arguments);
    return obj;
  };
  return cls;
};
