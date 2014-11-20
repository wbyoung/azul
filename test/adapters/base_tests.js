'use strict';

var expect = require('chai').expect;
var Adapter = require('../../lib/adapters/base');

var adapter;

describe('Adapter', function() {
  beforeEach(function() { adapter = Adapter.create({}); });

  it('requires a subclass to implement #_connect', function(done) {
    adapter._connect()
    .throw('Expected method to return rejected promise.')
    .catch(function(e) {
      expect(e.message).to.match(/_connect.*subclass/i);
    })
    .then(done, done);
  });

  it('requires a subclass to implement #_disconnect', function(done) {
    adapter._disconnect()
    .throw('Expected method to return rejected promise.')
    .catch(function(e) {
      expect(e.message).to.match(/_disconnect.*subclass/i);
    })
    .then(done, done);
  });

  it('requires a subclass to implement #_execute', function(done) {
    adapter._execute()
    .throw('Expected method to return rejected promise.')
    .catch(function(e) {
      expect(e.message).to.match(/_execute.*subclass/i);
    })
    .then(done, done);
  });
});
