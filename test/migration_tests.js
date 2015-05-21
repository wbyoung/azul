'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;
var path = require('path');
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var BluebirdPromise = require('bluebird');

var Migration = require('../lib/migration');
var EntryQuery = require('../lib/query/entry');
var Schema = require('../lib/schema');
var FakeAdapter = require('./fakes/adapter');
var migration, adapter, query;

describe('Migration', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    query = EntryQuery.create(adapter);
    migration = Migration.create(query,
      path.join(__dirname, 'fixtures/migrations/blog'));
  });

  describe('#_readMigrations', function() {

    it('reads migrations in order', function(done) {
      migration._readMigrations().then(function(migrations) {
        expect(migrations).to.eql([
          { name: '20141022202234_create_articles' },
          { name: '20141022202634_create_comments' },
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
          }, require('./fixtures/migrations/blog/' +
            '20141022202234_create_articles')),
          _.extend({
            name: '20141022202634_create_comments'
          }, require('./fixtures/migrations/blog/' +
            '20141022202634_create_comments'))
        ]);
      })
      .done(done, done);
    });

  });

  describe('#_readPendingMigrations', function() {
    beforeEach(function(done) {
      migration._transaction.begin().then(function() { done(); }, done);
    });
    afterEach(function(done) {
      migration._transaction.commit().then(function() { done(); }, done);
    });

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
      adapter.interceptSelectMigrations([
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
    beforeEach(function(done) {
      migration._transaction.begin().then(function() { done(); }, done);
    });
    afterEach(function(done) {
      migration._transaction.commit().then(function() { done(); }, done);
    });

    it('loads pending migrations', function(done) {
      adapter.interceptSelectMigrations([
        '20141022202234_create_articles'
      ]);

      migration._loadPendingMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          _.extend({
            name: '20141022202634_create_comments',
            batch: 2
          }, require('./fixtures/migrations/blog/' +
            '20141022202634_create_comments')),
        ]);
      })
      .done(done, done);
    });

  });

  describe('#_readExecutedMigrations', function() {
    beforeEach(function(done) {
      migration._transaction.begin().then(function() { done(); }, done);
    });
    afterEach(function(done) {
      migration._transaction.commit().then(function() { done(); }, done);
    });

    it('reads migrations in order', function(done) {
      adapter.interceptSelectMigrations([
        '20141022202234_create_articles',
        '20141022202634_create_comments'
      ]);

      migration._readExecutedMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          { name: '20141022202234_create_articles', batch: 1 },
          { name: '20141022202634_create_comments', batch: 1 }
        ]);
        expect(_.last(adapter.executedSQL())[0])
          .to.match(/select.*from "azul_migrations".*order by "name" desc/i);
      })
      .done(done, done);
    });

  });

  describe('#_loadExecutedMigrations', function() {
    beforeEach(function(done) {
      migration._transaction.begin().then(function() { done(); }, done);
    });
    afterEach(function(done) {
      migration._transaction.commit().then(function() { done(); }, done);
    });

    it('loads migrations in order', function(done) {
      adapter.interceptSelectMigrations([
        '20141022202234_create_articles'
      ]);

      migration._loadExecutedMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          _.extend({
            name: '20141022202234_create_articles',
            batch: 1
          }, require('./fixtures/migrations/blog/' +
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

      it('resolves with migration details', function(done) {
        migration.migrate().then(function(migrations) {
          expect(_.map(migrations, 'batch')).to.eql([1, 1]);
          expect(_.map(migrations, 'name'))
            .to.eql(['migration_file_1', 'migration_file_2']);
        })
        .done(done, done);
      });

      it('calls the up methods with the correct args', function(done) {
        migration.migrate().bind(this).then(function() {
          expect(this.mod1.up).to.have.been.calledOnce;
          expect(this.mod1.up.getCall(0).args.length).to.eql(2);
          expect(this.mod1.up.getCall(0).args[0])
            .to.be.instanceof(Schema.__class__);
          expect(this.mod1.up.getCall(0).args[1])
            .to.be.instanceof(EntryQuery.__class__);
          expect(this.mod2.up).to.have.been.calledOnce;
          expect(this.mod2.up.getCall(0).args.length).to.eql(2);
          expect(this.mod2.up.getCall(0).args[0])
            .to.be.instanceof(Schema.__class__);
          expect(this.mod2.up.getCall(0).args[1])
            .to.be.instanceof(EntryQuery.__class__);
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

      it('rolls back transaction for failed migration', function(done) {
        this.mod2.up = function() {
          throw new Error('Intentional Error');
        };
        migration.migrate().throw('Migration should have been rolled back.')
        .catch(function(e) {
          expect(e.message).to.eql('Intentional Error');
          expect(adapter.executedSQL()).to.eql([
            ['BEGIN', []],
            ['ROLLBACK', []]
          ]);
        })
        .done(done, done);
      });

      it('raises a descriptive error if rollback fails', function(done) {
        adapter.intercept(/rollback/i, function() {
          throw new Error('Cannot rollback.');
        });
        this.mod2.up = function() {
          throw new Error('Intentional Error');
        };
        migration.migrate().throw('Migration should have been rolled back.')
        .catch(function(e) {
          expect(e.message)
            .to.match(/intentional error.*rollback.*cannot rollback/i);
          expect(adapter.executedSQL()).to.eql([
            ['BEGIN', []],
            ['ROLLBACK', []]
          ]);
        })
        .done(done, done);
      });

      it('records migrations in database', function(done) {
        migration.migrate().bind(this).then(function() {
          expect(adapter.executedSQL()).to.eql([
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
          expect(adapter.executedSQL()).to.eql([
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
      var mods = this.mods = [mod1, mod2];
      sinon.stub(migration, '_loadExecutedMigrations')
        .returns(BluebirdPromise.resolve(mods));
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

      it('resolves with migration details', function(done) {
        migration.rollback().then(function(migrations) {
          expect(_.map(migrations, 'batch')).to.eql([1, 1]);
          expect(_.map(migrations, 'name'))
            .to.eql(['migration_file_1', 'migration_file_2']);
        })
        .done(done, done);
      });

      it('works when there are no migrations to run', function(done) {
        this.mods.splice(0, 2);
        migration.rollback().bind(this).then(function() {
          expect(this.mod1.down).to.not.have.been.called;
          expect(this.mod2.down).to.not.have.been.called;
        })
        .done(done, done);
      });

      it('calls the down methods with the correct args', function(done) {
        migration.rollback().bind(this).then(function() {
          expect(this.mod1.down).to.have.been.calledOnce;
          expect(this.mod1.down.getCall(0).args.length).to.eql(2);
          expect(this.mod1.down.getCall(0).args[0])
            .to.be.instanceof(Schema.__class__);
          expect(this.mod1.down.getCall(0).args[1])
            .to.be.instanceof(EntryQuery.__class__);
          expect(this.mod2.down).to.have.been.calledOnce;
          expect(this.mod2.down.getCall(0).args.length).to.eql(2);
          expect(this.mod2.down.getCall(0).args[0])
            .to.be.instanceof(Schema.__class__);
          expect(this.mod2.down.getCall(0).args[1])
            .to.be.instanceof(EntryQuery.__class__);
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

      it('rolls back transaction for failed migration', function(done) {
        this.mod2.down = function() {
          throw new Error('Intentional Error');
        };
        migration.rollback().throw('Migration should have been rolled back.')
        .catch(function(e) {
          expect(e.message).to.eql('Intentional Error');
          expect(adapter.executedSQL()).to.eql([
            ['BEGIN', []],
            ['ROLLBACK', []]
          ]);
        })
        .done(done, done);
      });

      it('raises a descriptive error if rollback fails', function(done) {
        adapter.intercept(/rollback/i, function() {
          throw new Error('Cannot rollback.');
        });
        this.mod2.down = function() {
          throw new Error('Intentional Error');
        };
        migration.rollback().throw('Rollback should have been rolled back.')
        .catch(function(e) {
          expect(e.message)
            .to.match(/intentional error.*rollback.*cannot rollback/i);
          expect(adapter.executedSQL()).to.eql([
            ['BEGIN', []],
            ['ROLLBACK', []]
          ]);
        })
        .done(done, done);
      });

      it('removes migrations recorded in database', function(done) {
        migration.rollback().bind(this).then(function() {
          expect(adapter.executedSQL()).to.eql([
            ['BEGIN', []],
            ['DELETE FROM "azul_migrations" WHERE "batch" = ?', [1]],
            ['COMMIT', []]
          ]);
        })
        .done(done, done);
      });
    });
  });

  describe('with pending migrations creating tables', function() {
    beforeEach(function() {
      var cols = function(table) { table.integer('id'); };
      var mod1 = this.mod1 = {
        up: sinon.spy(function(schema, query) {
          query.update('example0', { id: 0 });
          schema.createTable('example1', cols);
          schema.createTable('example2', cols);
        }),
        down: sinon.spy(function(/*schema*/) {}),
        name: 'migration_file_1', batch: 1
      };
      var mod2 = this.mod2 = {
        up: sinon.spy(function(schema) {
          schema.createTable('wont_happen1', cols);
          schema.createTable('wont_happen2', cols);
          // promise return value means async is the responsibility
          // of the author here (above queries should not be executed).
          return schema.createTable('example3', cols);
        }),
        down: sinon.spy(function(/*schema*/) {}),
        name: 'migration_file_2', batch: 1
      };
      sinon.stub(migration, '_loadPendingMigrations')
        .returns(BluebirdPromise.resolve([mod1, mod2]));
    });
    afterEach(function() {
      migration._loadPendingMigrations.restore();
    });

    it('runs all expected queries', function(done) {
        migration.migrate().then(function(/*migrations*/) {
          expect(adapter.executedSQL()).to.eql([
            ['BEGIN', []],
            ['UPDATE "example0" SET "id" = ?', [0]],
            ['CREATE TABLE "example1" ("id" integer PRIMARY KEY)', []],
            ['CREATE TABLE "example2" ("id" integer PRIMARY KEY)', []],
            ['CREATE TABLE "example3" ("id" integer PRIMARY KEY)', []],
            ['INSERT INTO "azul_migrations" ("name", "batch") ' +
             'VALUES (?, ?), (?, ?)', [
               'migration_file_1', 1, 'migration_file_2', 1]],
            ['COMMIT', []],
          ]);
        })
        .done(done, done);
    });
  });

  describe('with pending migrations executing queries in simple query', function() {
    beforeEach(function() {
      var mod = this.mod = {
        up: sinon.spy(function(schema, query) {
          query.update('users', { id: 5 }).execute();
        }),
        down: sinon.spy(function(/*schema*/) {}),
        name: 'migration_file_1', batch: 1
      };
      sinon.stub(migration, '_loadPendingMigrations')
        .returns(BluebirdPromise.resolve([mod]));
    });
    afterEach(function() {
      migration._loadPendingMigrations.restore();
    });

    it('informs the user this is invalid', function(done) {
        migration.migrate()
        .throw(new Error('Expected migration to fail.'))
        .catch(function(e) {
          expect(e).to.match(/serial migration.*must not execute/i);
        })
        .done(done, done);
    });
  });

  describe('with pending migrations using invalid simple query', function() {
    beforeEach(function() {
      var mod = this.mod = {
        up: sinon.spy(function(schema, query) {
          var q = query.update('users');
          q.set({ id: 5 }); // two queries derived from q not allowed
          q.set({ id: 6 });
        }),
        down: sinon.spy(function(/*schema*/) {}),
        name: 'migration_file_1', batch: 1
      };
      sinon.stub(migration, '_loadPendingMigrations')
        .returns(BluebirdPromise.resolve([mod]));
    });
    afterEach(function() {
      migration._loadPendingMigrations.restore();
    });

    it('informs the user this is invalid', function(done) {
        migration.migrate()
        .throw(new Error('Expected migration to fail.'))
        .catch(function(e) {
          expect(e).to.match(/serial migration.*must not re-use/i);
        })
        .done(done, done);
    });
  });

  describe('with pending migrations spawning queries', function() {
    beforeEach(function() {
      var mod = this.mod = {
        up: sinon.spy(function(schema, query) {
          var q = query.update('users');
          q.set({ id: 5 });
          q.set({ id: 6 });
          return BluebirdPromise.resolve();
        }),
        down: sinon.spy(function(/*schema*/) {}),
        name: 'migration_file_1', batch: 1
      };
      sinon.stub(migration, '_loadPendingMigrations')
        .returns(BluebirdPromise.resolve([mod]));
    });
    afterEach(function() {
      migration._loadPendingMigrations.restore();
    });

    it('does not run queries', function(done) {
        migration.migrate().then(function(/*migrations*/) {
          expect(adapter.executedSQL()).to.eql([
            ['BEGIN', []],
            ['INSERT INTO "azul_migrations" ("name", "batch") ' +
             'VALUES (?, ?)', ['migration_file_1', 1]],
            ['COMMIT', []],
          ]);
        })
        .done(done, done);
    });
  });

  describe('#_determineReverseAction', function() {
    // to make this happen, we'll probably want to pass a fake object off to
    // the migration's `change` method and record any calls that are made on
    // it. from there, the reverse actions can be built.

    // a possibly simpler way to do this would be to create a ReverseSchema
    // class that basically just has a bunch of functions that map to the
    // opposite of what they are. so `createTable` would map to a
    // `DropTableQuery` and (as long as the arguments match), that would be
    // all that was required. imposing a rule that reversible actions have
    // arguments that directly overlap with their reverse action's arguments
    // (drop table needs only the table name, but no more of create table's
    // arguments) may be easy. it'd also be easy to say it's _only_ the first
    // argument of the call through `createTable` that should be passed off to
    // the creation of a `DropTableQuery`. argument mapping may be more
    // complicated, but still could be decently easy.
    it('knows the reverse of creating a table');
  });
});
