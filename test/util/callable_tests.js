'use strict';

var expect = require('chai').expect;
var callable = require('../../lib/util/callable');

describe('callable', function() {

  it('accepts a constructor function');
  it('returns a class');
  it('calls __call__');
  it('uses callable object in __call__');
  it('uses callable object in constructor');
  it('passes arguments through to the constructor');
  it('passes arguments through to __call__');
  it('creates instances when called');

  describe('created instance', function() {
    it('is a type of the class');
    it('can call methods defined on the class');
  });
});
