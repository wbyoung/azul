'use strict';

var expect = require('chai').expect;
var callable = require('../../lib/util/callable');

describe('callable', function() {

  it('accepts a constructor function');
  it('returns a class');
  it('calls `call`');
  it('uses callable object in `call`');
  it('uses callable object in constructor');
  it('passes arguments through to the constructor');
  it('passes arguments through to `call`');
  it('creates instances when called');
  it('creates instances with a __proto__ set to the class prototype');

  describe('created instance', function() {
    it('is a type of the class');
    it('can call methods defined on the class');
  });
});
