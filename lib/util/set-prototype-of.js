'use strict';

module.exports = Object.setPrototypeOf || function(obj, proto) {
  var property = '__proto__'; // trick jshint
  obj[property] = proto; return obj;
};
