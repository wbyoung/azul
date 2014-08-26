'use strict';

var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;
chai.use(require('sinon-chai'));

var w = require('../lib/db/condition');

describe('condition (w)', function() {
  describe('creation', function() {
    it('returns the given object if it\'s a condition', function() {
      var c = w({ id: 1 });
      expect(w(c)).to.equal(c);
    });

    it('can be iterated', function() {
      var spy = sinon.spy();
      w({ id: 1 }).each(spy);
      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('id', 1, '=');
    });
  });
});
