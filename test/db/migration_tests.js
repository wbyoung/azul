'use strict';

var expect = require('chai').expect;
var path = require('path');

var Migration = require('../../lib/db/migration');
var MockAdapter = require('../mocks/adapter');
var migration;

describe('Migration', function() {
  before(function() {
    migration = Migration.create(MockAdapter.create(),
      path.join(__dirname, '../fixtures/migrations/blog'));
  });

  describe('#_readMigrations', function() {

    it('reads migrations in order', function(done) {
      migration._readMigrations().then(function(migrations) {
        expect(migrations).to.eql([
          '20141022202234_create_articles',
          '20141022202634_create_comments'
        ]);
      })
      .done(done, done);
    });

  });

  describe('#_loadMigrations', function() {

    it('loads migrations in order', function(done) {
      migration._loadMigrations().then(function(migrations) {
        expect(migrations).to.eql([
          require('../fixtures/migrations/blog/' +
            '20141022202234_create_articles'),
          require('../fixtures/migrations/blog/' +
            '20141022202634_create_comments')
        ]);
      })
      .done(done, done);
    });

  });

  describe('#_determineReverseAction', function() {
    // to make this happen, we'll probably want to pass a fake object off to
    // the migration's `change` method and record any calls that are made on
    // it. from there, the reverse actions can be built.
    it('knows the reverse of creating a table');
  });

  describe('#migrate', function() {
    it('rolls back transaction for failed migration forward');
    it('rolls back transaction for failed migration backward');
  });
});
