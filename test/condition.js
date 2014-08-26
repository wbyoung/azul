'use strict';

var chai = require('chai');
var sinon = require('sinon');
var expect = chai.expect;
chai.use(require('sinon-chai'));

var util = require('util');
var Condition = require('../lib/db/condition'), w = Condition;

describe('condition', function() {
  beforeEach(function() {
    this.expression = sinon.spy(function(key, value, operation) {
      var ops = { 'exact': '=' };
      return util.format('%s %s %j', key, ops[operation], value);
    });
    this.op = sinon.spy(function(type) { return type; });
  });

  describe('creation', function() {
    it('returns the given object if it\'s a condition', function() {
      var c = w({ id: 1 });
      expect(w(c)).to.equal(c);
    });
  });

  it('can be iterated', function() {
    var spy = sinon.spy();
    w({ id: 1 }).each(spy);
    expect(spy).to.have.been.calledOnce;
    expect(spy).to.have.been.calledWith('id', 1, '=');
  });

  it('can build expressions', function() {
    var c = w({ id: 1 }, { name: 'Whitney' });
    var result = c.build(this.expression, this.op);
    expect(result).to.eql('id = 1 and name = "Whitney"');
  });

  describe('operations', function() {
    it('extracts operations', function() {
      var details = Condition._operation('id[gt]');
      expect(details.key).to.eql('id');
      expect(details.operation).to.equal('gt');
    });

    it('defaults to exact', function() {
      var details = Condition._operation('address');
      expect(details.key).to.eql('address');
      expect(details.operation).to.equal('exact');
    });

    // TODO: should this be via the adapter, the query, or the condition?
    it('raises for unsupported operations');
  });

  describe('sub-queries', function() {
    it('builds complex expressions', function() {

      var firstPredicate = w({ first: 'Whit' }, w.or, { first: 'Whitney' });
      var lastPredicate = { last: 'Young' };
      var fullPredicate = w(firstPredicate, w.and, lastPredicate);

      var result = fullPredicate.build(this.expression, this.op);

      expect(result).to.eql('(first = "Whit" or first = "Whitney") and last = "Young"');
    });
  });
});
