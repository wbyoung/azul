'use strict';

var chai = require('chai');
var expect = chai.expect;
var path = require('path');
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var BluebirdPromise = require('bluebird');

var Migration = require('../../lib/db/migration');
var Schema = require('../../lib/db/schema');
var MockAdapter = require('../mocks/adapter');
var migration, schema;

describe('Migration', function() {
  before(function() {
    var adapter = MockAdapter.create();
    schema = Schema.create(adapter);
    migration = Migration.create(adapter, schema,
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

  describe('with fake migrations loaded', function() {
    beforeEach(function() {
      this.up1 = sinon.spy();
      this.up2 = sinon.spy();
      this.down1 = sinon.spy();
      this.down2 = sinon.spy();

      migration._loadMigrations = BluebirdPromise.method(function() {
        return [
          { up: this.up1, down: this.down1 },
          { up: this.up2, down: this.down2 }
        ]
      }.bind(this));
    });

    describe('#migrate', function() {

      it('calls the up methods', function(done) {
        migration.migrate().bind(this).then(function() {
          expect(this.up1).to.have.been.calledOnce;
          expect(this.up2).to.have.been.calledOnce;
        })
        .done(done, done);
      });

      it('calls the up methods with the schema', function(done) {
        migration.migrate().bind(this).then(function() {
          expect(this.up1).to.have.been.calledWithExactly(schema);
          expect(this.up2).to.have.been.calledWithExactly(schema);
        })
        .done(done, done);
      });

      it('does not call the down methods', function(done) {
        migration.migrate().bind(this).then(function() {
          expect(this.down1).to.not.have.been.called;
          expect(this.down2).to.not.have.been.called;
        })
        .done(done, done);
      });

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
