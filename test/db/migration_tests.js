'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;
var path = require('path');
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var BluebirdPromise = require('bluebird');

var Migration = require('../../lib/db/migration');
var EntryQuery = require('../../lib/db/query/entry');
var Schema = require('../../lib/db/schema');
var MockAdapter = require('../mocks/adapter');
var migration, schema, adapter, query;

// TODO: remove uses of this.adapter

describe('Migration', function() {
  before(function() {
    adapter = this.adapter = MockAdapter.create({});
    query = EntryQuery.create(adapter);
    schema = Schema.create(adapter);
    migration = Migration.create(query, schema,
      path.join(__dirname, '../fixtures/migrations/blog'));
  });

  beforeEach(function() {
    var results = {};
    sinon.spy(schema, 'begin');
    sinon.stub(adapter, '_execute', function(client, sql/*, args*/) {
      var rows, fields, command;
      if (sql.match(/select/i)) {
        rows = results.select;
        fields = ['id', 'name', 'batch'];
        command = 'SELECT';
      }
      return {
        rows: rows || [],
        fields: fields || [],
        command: command || 'MOCK_COMMAND'
      };
    });
    adapter._execute.selectReturnsExecutedMigrations = function(names) {
      results.select = names.map(function(name, index) {
        return { id: index + 1, name: name, batch: 1 };
      });
    };
    adapter._execute.sqlCalls = function() {
      return _.times(adapter._execute.callCount, function(index) {
        return adapter._execute.getCall(index).args.slice(1);
      });
    };
  });

  afterEach(function() {
    schema.begin.restore();
    adapter._execute.restore();
  });

  describe('#_readMigrations', function() {

    it('reads migrations in order', function(done) {
      migration._readMigrations().then(function(migrations) {
        expect(migrations).to.eql([
          { name: '20141022202234_create_articles' },
          { name: '20141022202634_create_comments' }
        ]);
      })
      .done(done, done);
    });

  });

  describe('#_loadMigrations', function() {

    it('loads migrations in order', function(done) {
      migration._loadMigrations().then(function(migrations) {
        expect(migrations).to.eql([
          _.extend({
            name: '20141022202234_create_articles'
          }, require('../fixtures/migrations/blog/' +
            '20141022202234_create_articles')),
          _.extend({
            name: '20141022202634_create_comments'
          }, require('../fixtures/migrations/blog/' +
            '20141022202634_create_comments'))
        ]);
      })
      .done(done, done);
    });

  });

  describe('#_readPendingMigrations', function() {

    it('reads migrations in order', function(done) {
      migration._readPendingMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          { name: '20141022202234_create_articles', batch: 1 },
          { name: '20141022202634_create_comments', batch: 1 }
        ]);
      })
      .done(done, done);
    });

    it('does not include executed migrations', function(done) {
      adapter._execute.selectReturnsExecutedMigrations([
        '20141022202234_create_articles'
      ]);

      migration._readPendingMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          { name: '20141022202634_create_comments', batch: 2 }
        ]);
      })
      .done(done, done);
    });

  });

  describe('#_loadPendingMigrations', function() {

    it('loads pending migrations', function(done) {
      adapter._execute.selectReturnsExecutedMigrations([
        '20141022202234_create_articles'
      ]);

      migration._loadPendingMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          _.extend({
            name: '20141022202634_create_comments',
            batch: 2
          }, require('../fixtures/migrations/blog/' +
            '20141022202634_create_comments')),
        ]);
      })
      .done(done, done);
    });

  });

  describe('#_readExecutedMigrations', function() {

    it('reads migrations in order', function(done) {
      adapter._execute.selectReturnsExecutedMigrations([
        '20141022202634_create_comments',
        '20141022202234_create_articles'
      ]);

      migration._readExecutedMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          { name: '20141022202234_create_articles', batch: 1 },
          { name: '20141022202634_create_comments', batch: 1 }
        ]);
      })
      .done(done, done);
    });

  });

  describe('#_loadExecutedMigrations', function() {

    it('loads migrations in order', function(done) {
      adapter._execute.selectReturnsExecutedMigrations([
        '20141022202234_create_articles'
      ]);

      migration._loadExecutedMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          _.extend({
            name: '20141022202234_create_articles',
            batch: 1
          }, require('../fixtures/migrations/blog/' +
            '20141022202234_create_articles')),
        ]);
      })
      .done(done, done);
    });

  });

  describe('with pending migrations stubbed', function() {
    beforeEach(function() {
      var mod1 = this.mod1 = {
        up: sinon.spy(), down: sinon.spy(),
        name: 'migration_file_1', batch: 1
      };
      var mod2 = this.mod2 = {
        up: sinon.spy(), down: sinon.spy(),
        name: 'migration_file_2', batch: 1
      };
      sinon.stub(migration, '_loadPendingMigrations')
        .returns(BluebirdPromise.resolve([mod1, mod2]));
    });
    afterEach(function() {
      migration._loadPendingMigrations.restore();
    });

    describe('#migrate', function() {

      it('calls the up methods', function(done) {
        migration.migrate().bind(this).then(function() {
          expect(this.mod1.up).to.have.been.calledOnce;
          expect(this.mod2.up).to.have.been.calledOnce;
        })
        .done(done, done);
      });

      it('calls the up methods with the schema as a transaction', function(done) {
        migration.migrate().bind(this).then(function() {
          var schemaTransaction = schema.begin.returnValues[0];
          expect(this.mod1.up).to.have.been
            .calledWithExactly(schemaTransaction);
          expect(this.mod2.up).to.have.been
            .calledWithExactly(schemaTransaction);
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

      it('records migrations in database', function(done) {
        migration.migrate().bind(this).then(function() {
          expect(this.adapter._execute.sqlCalls()).to.eql([
            ['BEGIN', []],
            [
              'INSERT INTO "azul_migrations" ("name", "batch") ' +
              'VALUES (?, ?), (?, ?)',
              ['migration_file_1', 1, 'migration_file_2', 1]
            ],
            ['COMMIT', []]
          ]);
        })
        .done(done, done);
      });
    });
  });

  describe('with pending migrations stubbed as empty', function() {
    beforeEach(function() {
      sinon.stub(migration, '_loadPendingMigrations')
        .returns(BluebirdPromise.resolve([]));
    });
    afterEach(function() {
      migration._loadPendingMigrations.restore();
    });

    describe('#migrate', function() {

      it('does not record migrations in database', function(done) {
        migration.migrate().bind(this).then(function() {
          expect(this.adapter._execute.sqlCalls()).to.eql([
            ['BEGIN', []],
            ['COMMIT', []]
          ]);
        })
        .done(done, done);
      });

    });

  });

  describe('with executed migrations stubbed', function() {
    beforeEach(function() {
      var mod1 = this.mod1 = {
        up: sinon.spy(), down: sinon.spy(),
        name: 'migration_file_1', batch: 1
      };
      var mod2 = this.mod2 = {
        up: sinon.spy(), down: sinon.spy(),
        name: 'migration_file_2', batch: 1
      };
      sinon.stub(migration, '_loadExecutedMigrations')
        .returns(BluebirdPromise.resolve([mod1, mod2]));
    });
    afterEach(function() {
      migration._loadExecutedMigrations.restore();
    });

    describe('#rollback', function() {

      it('calls the down methods', function(done) {
        migration.rollback().bind(this).then(function() {
          expect(this.mod1.down).to.have.been.calledOnce;
          expect(this.mod2.down).to.have.been.calledOnce;
        })
        .done(done, done);
      });

      it('calls the down methods with the schema as a transaction', function(done) {
        migration.rollback().bind(this).then(function() {
          var schemaTransaction = schema.begin.returnValues[0];
          expect(this.mod1.down).to.have.been
            .calledWithExactly(schemaTransaction);
          expect(this.mod2.down).to.have.been
            .calledWithExactly(schemaTransaction);
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

      it('removes migrations recorded in database', function(done) {
        migration.rollback().bind(this).then(function() {
          expect(this.adapter._execute.sqlCalls()).to.eql([
            ['BEGIN', []],
            ['DELETE FROM "azul_migrations" WHERE "batch" = ?', [1]],
            ['COMMIT', []]
          ]);
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
