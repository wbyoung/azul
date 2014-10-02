'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
chai.use(require('sinon-chai'));

var callable = require('../../lib/util/callable');
var getPrototypeOf = require('../../lib/util/proto').getPrototypeOf;

describe('callable', function() {

  beforeEach(function() {
    this.constructorSpy = sinon.spy();
    this.callSpy = sinon.spy();
    this.Callable = callable(this.constructorSpy);
    this.Callable.prototype.call = this.callSpy;
  });

  it('returns a class', function() {
    expect(this.Callable.prototype).to.exist;
  });

  describe('instance', function() {
    beforeEach(function() {
      this.instance = new this.Callable('creating', 'callable');
    });
    it('exists', function() {
      expect(this.instance).to.exist;
    });
    it('calls the constructor', function() {
      expect(this.constructorSpy).to.have.been.calledOnce;
    });
    it('uses callable object in constructor', function() {
      expect(this.constructorSpy.firstCall.thisValue).to.equal(this.instance);
    });
    it('passes arguments through to the constructor', function() {
      expect(this.constructorSpy).to.have.been.calledWithExactly('creating', 'callable');
    });
    it('has a __proto__ set to the class prototype', function() {
      expect(getPrototypeOf(this.instance)).to.equal(this.Callable.prototype);
    });
    it('is a type of the class', function() {
      expect(this.instance).to.be.an.instanceOf(this.Callable);
    });
    it('does not call the `call` function', function() {
      expect(this.callSpy).to.not.have.been.called;
    });
    it('can call methods defined on the class', function() {
      var spy = sinon.spy();
      this.Callable.prototype.testMethod = spy;
      this.instance.testMethod();
      expect(spy).to.have.been.called;
    });

    describe('when called', function() {
      beforeEach(function() {
        this.instance('calling', 'callable');
      });
      it('calls `call`', function() {
        expect(this.callSpy).to.have.been.calledOnce;
      });
      it('uses callable object in `call`', function() {
        expect(this.callSpy.firstCall.thisValue).to.equal(this.instance);
      });
      it('passes arguments through to `call`', function() {
        expect(this.callSpy).to.have.been.calledWithExactly('calling', 'callable');
      });
    });
  });
});
