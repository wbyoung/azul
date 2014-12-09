'use strict';

var chai = require('chai');
var expect = chai.expect;

var BaseQuery = require('../../lib/query/base');
var FakeAdapter = require('../fakes/adapter');

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

  it('cannot be executed', function(done) {
    query.execute()
    .throw('Expected execution to fail.')
    .catch(function(e) {
      expect(e).to.match(/cannot be used/i);
    })
    .done(done, done);
  });
});
