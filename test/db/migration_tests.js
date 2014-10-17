'use strict';

var chai = require('chai');
var expect = chai.expect;
var path = require('path');
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var BluebirdPromise = require('bluebird');

var Migration = require('../../lib/db/migration');
var Query = require('../../lib/db/query');
var Schema = require('../../lib/db/schema');
var MockAdapter = require('../mocks/adapter');
var migration, schema;

describe('Migration', function() {
  before(function() {
    var adapter = this.adapter = MockAdapter.create({});
    var query = Query.create(adapter);
    schema = Schema.create(adapter);
    migration = Migration.create(query, schema,
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

  describe('#_readExecutedMigrations', function() {

    it('reads migrations in order', function(done) {
      sinon.stub(this.adapter, '_execute').onSecondCall().returns({
        rows: [
          { id: 2, name: '20141022202634_create_comments', batch: 1 },
          { id: 1, name: '20141022202234_create_articles', batch: 1 }
        ],
        fields: ['id', 'name', 'batch'],
        command: 'SELECT'
      });

      migration._readExecutedMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          '20141022202234_create_articles',
          '20141022202634_create_comments'
        ]);
      })
      .finally(function() { this.adapter._execute.restore(); })
      .done(done, done);
    });

  });

  describe('#_loadExecutedMigrations', function() {

    it('loads migrations in order', function(done) {
      sinon.stub(this.adapter, '_execute').onSecondCall().returns({
        rows: [{ id: 1, name: '20141022202234_create_articles', batch: 1 }],
        fields: ['id', 'name', 'batch'],
        command: 'SELECT'
      });

      migration._loadExecutedMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          require('../fixtures/migrations/blog/' +
            '20141022202234_create_articles'),
        ]);
      })
      .finally(function() { this.adapter._execute.restore(); })
      .done(done, done);
    });

  });

  describe('with fake migrations loaded', function() {
    beforeEach(function() {
      var mod1 = this.mod1 = { up: sinon.spy(), down: sinon.spy() };
      var mod2 = this.mod2 = { up: sinon.spy(), down: sinon.spy() };
      migration._loadMigrations = BluebirdPromise.method(function() {
        return [mod1, mod2];
      });
    });

    describe('#migrate', function() {

      it('calls the up methods', function(done) {
        migration.migrate().bind(this).then(function() {
          expect(this.mod1.up).to.have.been.calledOnce;
          expect(this.mod2.up).to.have.been.calledOnce;
        })
        .done(done, done);
      });

      it('calls the up methods with the schema', function(done) {
        migration.migrate().bind(this).then(function() {
          expect(this.mod1.up).to.have.been.calledWithExactly(schema);
          expect(this.mod2.up).to.have.been.calledWithExactly(schema);
        })
        .done(done, done);
      });

      it('does not call the down methods', function(done) {
        migration.migrate().bind(this).then(function() {
          expect(this.mod1.down).to.not.have.been.called;
          expect(this.mod2.down).to.not.have.been.called;
        })
        .done(done, done);
      });

      it('respects migration promises', function(done) {
        var sequence = 0;
        var up1Sequence;
        var up2Sequence;

        this.mod1.up = function() {
          return BluebirdPromise.delay(5).then(function() {
            up1Sequence = sequence++;
          });
        };
        this.mod2.up = function() {
          return BluebirdPromise.delay(0).then(function() {
            up2Sequence = sequence++;
          });
        };

        migration.migrate().then(function() {
          expect(up1Sequence).to.eql(0);
          expect(up2Sequence).to.eql(1);
        })
        .done(done, done);
      });

      it.skip('only applies incomplete migrations', function(done) {
        sinon.stub(this.adapter, '_execute').onSecondCall().returns({
          rows: [{ id: 1, name: '20141022202234_create_articles', batch: 1 }],
          fields: ['id', 'name', 'batch'],
          command: 'SELECT'
        });

        migration.migrate().bind(this).then(function() {
          expect(this.mod1.up).to.not.have.been.called;
          expect(this.mod2.up).to.have.been.calledOnce;
        })
        .done(done, done);
      });

    });

    describe('#rollback', function() {

      it('calls the down methods', function(done) {
        migration.rollback().bind(this).then(function() {
          expect(this.mod1.down).to.have.been.calledOnce;
          expect(this.mod2.down).to.have.been.calledOnce;
        })
        .done(done, done);
      });

      it('calls the down methods with the schema', function(done) {
        migration.rollback().bind(this).then(function() {
          expect(this.mod1.down).to.have.been.calledWithExactly(schema);
          expect(this.mod2.down).to.have.been.calledWithExactly(schema);
        })
        .done(done, done);
      });

      it('does not call the up methods', function(done) {
        migration.rollback().bind(this).then(function() {
          expect(this.mod1.up).to.not.have.been.called;
          expect(this.mod2.up).to.not.have.been.called;
        })
        .done(done, done);
      });

      it('respects migration promises', function(done) {
        var sequence = 0;
        var down1Sequence;
        var down2Sequence;

        this.mod1.down = function() {
          return BluebirdPromise.delay(5).then(function() {
            down1Sequence = sequence++;
          });
        };
        this.mod2.down = function() {
          return BluebirdPromise.delay(0).then(function() {
            down2Sequence = sequence++;
          });
        };

        migration.rollback().then(function() {
          expect(down1Sequence).to.eql(0);
          expect(down2Sequence).to.eql(1);
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
