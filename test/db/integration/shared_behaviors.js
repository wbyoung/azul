'use strict';

var expect = require('chai').expect;
var path = require('path');
var BluebirdPromise = require('bluebird');

module.exports.shouldRunSimpleMigrationsAndQueries = function() {
  var db; before(function() { db = this.db; });

  describe('with migrations applied', function() {
    before(function(done) {
      var migration =
        path.join(__dirname, '../../fixtures/migrations/blog');
      this.migrator = db.migrator(migration);
      this.migrator.migrate().then(function() { done(); }, done);
    });

    after(function(done) {
      this.migrator.rollback().then(function() { done(); }, done);
    });

    // TODO: consider how to implement these tests. the intention here is
    // to create more of an integration style test. perhaps it should be
    // shared amongst all of the adapter test files somehow.
    it('inserts data');
    it('selects data');
    it('updates data');
    it('drops tables');
  });
};
