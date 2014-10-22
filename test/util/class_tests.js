'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var Class = require('../../lib/util/class');

describe('Class', function() {

  it('is an object', function() {
    expect(Class).to.be.instanceOf(Object);
  });

  it('is a function', function() {
    expect(Class).to.be.instanceOf(Function);
  });

  it('can be instantiated without being extended', function() {
    expect(Class.create()).to.exist;
  });

  it('creates classes that are themselves functions', function() {
    expect(Class.extend()).to.be.instanceOf(Function);
  });

  it('can be extended 1 time', function() {
    var Animal = Class.extend();
    var animal = Animal.create();
    expect(animal).to.be.instanceOf(Animal.__class__);
    expect(animal).to.be.instanceOf(Class.__class__);
  });

  it('can be extended 2 times', function() {
    var Animal = Class.extend();
    var Dog = Animal.extend();
    var dog = Dog.create();
    expect(dog).to.be.instanceOf(Dog.__class__);
    expect(dog).to.be.instanceOf(Animal.__class__);
    expect(dog).to.be.instanceOf(Class.__class__);
  });

  it('can be extended 3 times', function() {
    var Animal = Class.extend();
    var Dog = Animal.extend();
    var Havanese = Dog.extend();
    var milo = Havanese.create();
    expect(milo).to.be.instanceOf(Havanese.__class__);
    expect(milo).to.be.instanceOf(Dog.__class__);
    expect(milo).to.be.instanceOf(Animal.__class__);
    expect(milo).to.be.instanceOf(Class.__class__);
  });

  it('can call super', function() {
    var speak = sinon.stub().returns('speaking');
    var sup = function() { return this._super(); };
    var Animal = Class.extend({ speak: speak });
    var Dog = Animal.extend({ speak: sup });
    var Havanese = Dog.extend({ speak: sup });
    var milo = Havanese.create();
    expect(speak).to.not.have.been.called;
    expect(milo.speak()).to.eql('speaking');
    expect(speak).to.have.been.calledOnce;
  });

  it('can call super asynchronously', function(done) {
    var Animal = Class.extend({
      speak: function(cb) {
        setTimeout(function() {
          cb(null, 'speaking');
        }, 0);
      }
    });
    var Dog = Animal.extend({
      speak: function(cb) {
        var _super = this._super; // must capture super
        setTimeout(function() {
          _super(cb);
        }, 0);
      }
    });
    Dog.create().speak(function(err, message) {
      expect(message).to.eql('speaking');
      done();
    });
  });

  it('can call super in class methods', function() {
    var species = sinon.stub().returns('animal');
    var sup = function() { return this._super(); };
    var Animal = Class.extend({}, { species: species });
    var Dog = Animal.extend({}, { species: sup });
    var Havanese = Dog.extend({}, { species: sup });
    expect(species).to.not.have.been.called;
    expect(Havanese.species()).to.eql('animal');
    expect(species).to.have.been.calledOnce;
  });

  it('can call super in class methods asynchronously', function(done) {
    var Animal = Class.extend({}, {
      species: function(cb) {
        setTimeout(function() {
          cb(null, 'animal');
        }, 0);
      }
    });
    var Dog = Animal.extend({}, {
      species: function(cb) {
        var _super = this._super; // must capture super
        setTimeout(function() {
          _super(cb);
        }, 0);
      }
    });
    Dog.species(function(err, message) {
      expect(message).to.eql('animal');
      done();
    });
  });

  it('can specify methods', function() {
    var Animal = Class.extend({
      speak: function() { return 'hi'; }
    });
    expect(Animal.create().speak()).to.eql('hi');
  });

  it('can specify an new method', function() {
    var Subclass = Class.extend({
      new: function() { this.initialized = true; }
    });
    var obj = Subclass.create();
    expect(obj.initialized).to.be.true;
  });

  it('calls new methods in proper sequence', function() {
    var sequence = 0;
    var Animal = Class.extend({
      new: function() { this.animal = sequence++; }
    });
    var Dog = Animal.extend({
      new: function() { this.dog = sequence++; }
    });
    var dog = Dog.create();
    expect(dog.animal).to.eql(0);
    expect(dog.dog).to.eql(1);
  });

  it('can specify an init method', function() {
    var Subclass = Class.extend({
      init: function() { this.initialized = true; }
    });
    var obj = Subclass.create();
    expect(obj.initialized).to.be.true;
  });

  it('calls init methods in proper sequence', function() {
    var sequence = 0;
    var Animal = Class.extend({
      init: function() { this.animal = sequence++; }
    });
    var Dog = Animal.extend({
      init: function() { this._super(); this.dog = sequence++; }
    });
    var dog = Dog.create();
    expect(dog.animal).to.eql(0);
    expect(dog.dog).to.eql(1);
  });

  it('can be created uninitialized', function() {
    var newSpy = sinon.spy();
    var initSpy = sinon.spy();
    var Subclass = Class.extend({ new: newSpy, init: initSpy });
    var obj = Subclass.new();
    expect(obj).to.be.an.instanceOf(Subclass.__class__);
    expect(newSpy).to.have.been.calledOnce;
    expect(initSpy).to.not.have.been.called;
  });

  it('allows static methods to be accessed via sublcasses', function() {
    var Animal = Class.extend();
    var staticMember = {};
    Animal.reopenClass({
      staticMember: staticMember
    });
    expect(Animal.staticMember).to.eql(staticMember);
  });

  it('allows static methods to be accessed via sublcasses', function() {
    var Animal = Class.extend();
    var Dog = Animal.extend();
    var staticMember = {};
    Animal.reopenClass({ staticMember: staticMember });
    expect(Dog.staticMember).to.eql(staticMember);
    expect(Animal.staticMember).to.eql(staticMember);
  });

  it('creates instances that know their identity (class)', function() {
    var Animal = Class.extend();
    var Dog = Animal.extend({});
    var dog = Dog.create();
    expect(dog.__identity__).to.eql(Dog);
  });

  it('creates instances that are an instance of its class', function() {
    var Animal = Class.extend();
    var Dog = Animal.extend({});
    var dog = Dog.create();
    expect(dog).to.be.an.instanceOf(Dog.__class__);
  });

  it('creates instances that know their metaclass', function() {
    // this will likely never be useful for external use, but is important
    // internally.
    var Animal = Class.extend();
    var Dog = Animal.extend({});
    var dog = Dog.create();
    expect(dog.__metaclass__).to.eql(Dog.__metaclass__);
  });

  it('knows its identity (class)', function() {
    var Animal = Class.extend();
    var Dog = Animal.extend({});
    expect(Dog.__identity__).to.eql(Dog);
  });

  it('creates valid metaclass prototype chain', function() {
    // this will likely never be useful for external use, but is important
    // internally.
    var Animal = Class.extend({}, { __name__: 'Animal' });
    var Dog = Animal.extend({}, { __name__: 'Dog' });
    expect(Dog.__metaclass__.prototype).to.be.instanceOf(Animal.__metaclass__);
    expect(Dog.__metaclass__.prototype).to.be.instanceOf(Class.__metaclass__);
  });

  it('has descriptive instances', function() {
    var Animal = Class.extend();
    var Dog = Animal.extend({}, {
      __name__: 'Dog'
    });
    var dog = Dog.create();
    expect(dog.inspect()).to.eql('[Dog]');
    expect(dog.toString()).to.eql('[Dog]');
  });

  it('has descriptive classes', function() {
    var Animal = Class.extend();
    var Dog = Animal.extend({}, {
      __name__: 'Dog'
    });
    expect(Dog.inspect()).to.eql('[Dog Class]');
    expect(Dog.toString()).to.eql('[Dog Class]');
  });

});
