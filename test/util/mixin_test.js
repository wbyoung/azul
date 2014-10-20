'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;
var Class = require('../../lib/util/class');
var Mixin = require('../../lib/util/mixin');

describe('mixins', function() {
  it('looks just like an object', function() {
    var properties = {
      first: 'first',
      second: function() { return 'second'; }
    };
    var SimpleMixin = Mixin.create(properties);
    expect(_.clone(SimpleMixin)).to.eql(properties);
  });

  it('is a mixin', function() {
    var SimpleMixin = Mixin.create({});
    expect(SimpleMixin).to.be.instanceOf(Mixin.__class__);
  });

  it('can specify mixins without instance properties', function() {
    var BarkMixin = Mixin.create({
      bark: function() { return 'bark'; }
    });
    var Animal = Class.extend(BarkMixin);
    var animal = Animal.create();
    expect(animal.bark()).to.eql('bark');
  });

  it('can specify mixins with instance properties', function() {
    var BarkMixin = Mixin.create({
      bark: function() { return 'bark'; }
    });
    var Animal = Class.extend(BarkMixin, {
      walk: function() { return 'walk'; }
    });
    var animal = Animal.create();
    expect(animal.walk()).to.eql('walk');
    expect(animal.bark()).to.eql('bark');
  });

  it('allows multiple mixins', function() {
    var BarkMixin = Mixin.create({
      bark: function() { return 'bark'; }
    });
    var WalkMixin = Mixin.create({
      walk: function() { return 'walk'; }
    });
    var Animal = Class.extend(BarkMixin, WalkMixin, {});
    var animal = Animal.create();
    expect(animal.walk()).to.eql('walk');
    expect(animal.bark()).to.eql('bark');
  });

  it('support #_super', function() {
    var BarkMixin = Mixin.create({
      speak: function() { return 'bark ' + (this._super() || ''); }
    });
    var Animal = Class.extend(BarkMixin, {
      speak: function() {
        return 'animal ' + this._super();
      }
    });
    var Dog = Animal.extend(BarkMixin, {
      speak: function() {
        return 'dog ' + this._super();
      }
    });
    var dog = Dog.create();
    expect(dog.speak().trim()).to.eql('dog bark animal bark');
  });

  it('allows mixins to be created with mixins', function() {
    var AMixin = Mixin.create({
      fn: function() { return 'a'; }
    });

    var BMixin = Mixin.create({
      fn: function() { return this._super() + 'b'; }
    });

    var CMixin = Mixin.create(AMixin, BMixin, {
      fn: function() { return this._super() + 'c'; }
    });

    var Subclass = Class.extend(CMixin, {
      fn: function() { return this._super() + 'd'; }
    });
    var instance = Subclass.create();

    expect(instance.fn()).to.eql('abcd');
  });

  it('allows mixins to be created with mixins', function() {
    var AMixin = Mixin.create({
      fn: function() { return this._super() + 'a'; }
    });

    var BMixin = Mixin.create({
      fn: function() { return this._super() + 'b'; }
    });

    var CMixin = Mixin.create(AMixin, BMixin, {
      fn: function() { return this._super() + 'c'; }
    });

    var Baseclass = Class.extend({
      fn: function() { return '_'; }
    });

    var Subclass = Baseclass.extend(CMixin, {
      fn: function() { return this._super() + 'd'; }
    });
    var instance = Subclass.create();

    expect(instance.fn()).to.eql('_abcd');
  });

  it('cannot be extended again', function() {
    expect(function() {
      Mixin.extend();
    }).to.throw(/cannot extend mixin/i);
  });

});
