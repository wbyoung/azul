'use strict';

var chai = require('chai');
var expect = chai.expect;

var BaseQuery = require('../../../lib/db/query/base');
var MockAdapter = require('../../mocks/adapter');

var query;

describe('BaseQuery', function() {
  beforeEach(function() {
    query = BaseQuery.create(MockAdapter.create({}));
  });

  it('cannot generate sql', function() {
    expect(function() { query.sql(); })
      .throw(/BaseQuery.*cannot be used/i);
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
