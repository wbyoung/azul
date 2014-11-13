'use strict';

var chai = require('chai');
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var expect = chai.expect;

var BaseQuery = require('../../../lib/db/query/base');
var FakeAdapter = require('../../fakes/adapter');

var query;

describe('BaseQuery', function() {
  beforeEach(function() {
    query = BaseQuery.create(FakeAdapter.create({}));
  });

  it('cannot generate sql', function() {
    expect(function() { query.sql(); })
      .throw(/BaseQuery.*cannot be used/i);
  });

  it('can be cloned', function() {
    var clone = query.clone();
    expect(clone).to.not.equal(query);
    expect(clone._promise).to.not.equal(query._promise);
  });

  it('has a fetch method that aliases execute', function() {
    sinon.stub(query, 'execute');
    try {
      query.fetch();
      expect(query.execute).to.have.been.calledOnce;
    }
    finally {
      query.execute.restore();
    }
  });

  it('cannot be executed', function(done) {
    query.execute()
    .throw('Expected execution to fail.')
    .catch(function(e) {
      expect(e).to.match(/cannot be used/i);
    })
    .done(done, done);
  });
});
