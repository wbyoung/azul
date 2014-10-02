'use strict';

var __proto__ = '__proto__'; // trick jshint

module.exports.setPrototypeOf = Object.setPrototypeOf || function(obj, proto) {
  obj[__proto__] = proto; return obj;
};

module.exports.getPrototypeOf = Object.getPrototypeOf || function(obj) {
  return obj[__proto__];
};
