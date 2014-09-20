'use strict';

var expect = require('chai').expect;
var Class = require('../lib/util/class');

describe('Class', function() {

  it('can be extended', function() {
    var Animal = Class.extend();
    var animal = new Animal();
    expect(animal).to.be.instanceOf(Animal);
    expect(animal).to.be.instanceOf(Class);
  });

  it('can be extended again', function() {
    var Animal = Class.extend();
    var Dog = Animal.extend();
    var dog = new Dog();
    expect(dog).to.be.instanceOf(Dog);
    expect(dog).to.be.instanceOf(Animal);
    expect(dog).to.be.instanceOf(Class);
  });

  it('can specify methods', function() {
    var Animal = Class.extend({
      speak: function() { return 'hi'; }
    });
    expect(new Animal().speak()).to.eql('hi');
  });

  it('can specify an init method', function() {
    var Subclass = Class.extend({
      init: function() { this.initialized = true; }
    });
    var obj = new Subclass();
    expect(obj.initialized).to.be.true;
  });

  it('calls init methods in proper sequence', function() {
    var sequence = 0;
    var Animal = Class.extend({
      init: function() { this.animal = sequence++; }
    });
    var Dog = Animal.extend({
      init: function() { this.dog = sequence++; }
    });
    var dog = new Dog();
    expect(dog.animal).to.eql(0);
    expect(dog.dog).to.eql(1);
  });
});
