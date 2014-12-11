'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var Actionable = require('../../lib/util/actionable');

describe('Actionable', function() {

  it('executes the function when executed', function() {
    var spy = sinon.spy();
    var action = Actionable.create(spy);
    action.execute();
    expect(spy).to.have.been.calledOnce;
  });

  it('executes the function once when executed multiple times', function() {
    var spy = sinon.stub().returns('result');
    var action = Actionable.create(spy);
    action.execute();
    action.execute();
    expect(spy).to.have.been.calledOnce;
  });

  it('returns the first result when executed multiple times', function() {
    var action = Actionable.create(function() { return 'value'; });
    action.execute();
    expect(action.execute()).to.eql('value');
  });

  it('executes the function until it gets a result', function() {
    var spy = sinon.stub();
    var action = Actionable.create(spy);
    spy.onCall(1).returns('value');
    action.execute();
    action.execute();
    var result = action.execute();
    expect(spy).to.have.been.calledTwice;
    expect(result).to.eql('value');
  });

});
