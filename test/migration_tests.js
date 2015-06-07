'use strict';

require('./helpers');

var _ = require('lodash');
var path = require('path');
var Promise = require('bluebird');

var Migration = require('../lib/migration');
var EntryQuery = require('maguey').EntryQuery;
var Schema = require('maguey').Schema;
var migration;

describe('Migration', __query(function() {
  /* global query, adapter */

  beforeEach(function() {
    migration = Migration.create(query,
      path.join(__dirname, 'fixtures/migrations/blog'));
  });

  describe('#_readMigrations', function() {

    it('reads migrations in order', function() {
      return migration._readMigrations().then(function(migrations) {
        expect(migrations).to.eql([
          { name: '20141022202234_create_articles' },
          { name: '20141022202634_create_comments' },
        ]);
      });
    });

  });

  describe('#_loadMigrations', function() {

    it('loads migrations in order', function() {
      return migration._loadMigrations().then(function(migrations) {
        expect(migrations).to.eql([
          _.extend({
            name: '20141022202234_create_articles',
          }, require('./fixtures/migrations/blog/' +
            '20141022202234_create_articles')),
          _.extend({
            name: '20141022202634_create_comments',
          }, require('./fixtures/migrations/blog/' +
            '20141022202634_create_comments')),
        ]);
      });
    });

  });

  describe('#_readPendingMigrations', function() {
    beforeEach(function() {
      return migration._transaction.begin();
    });
    afterEach(function() {
      return migration._transaction.commit();
    });

    it('reads migrations in order', function() {
      return migration._readPendingMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          { name: '20141022202234_create_articles', batch: 1 },
          { name: '20141022202634_create_comments', batch: 1 },
        ]);
      });
    });

    it('does not include executed migrations', function() {
      adapter.respondToMigrations([
        '20141022202234_create_articles',
      ]);

      return migration._readPendingMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          { name: '20141022202634_create_comments', batch: 2 },
        ]);
      });
    });

  });

  describe('#_loadPendingMigrations', function() {
    beforeEach(function() {
      return migration._transaction.begin();
    });
    afterEach(function() {
      return migration._transaction.commit();
    });

    it('loads pending migrations', function() {
      adapter.respondToMigrations([
        '20141022202234_create_articles',
      ]);

      return migration._loadPendingMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          _.extend({
            name: '20141022202634_create_comments',
            batch: 2,
          }, require('./fixtures/migrations/blog/' +
            '20141022202634_create_comments')),
        ]);
      });
    });

  });

  describe('#_readExecutedMigrations', function() {
    beforeEach(function() {
      return migration._transaction.begin();
    });
    afterEach(function() {
      return migration._transaction.commit();
    });

    it('reads migrations in order', function() {
      adapter.respondToMigrations([
        '20141022202634_create_comments',
        '20141022202234_create_articles',
      ]);

      return migration._readExecutedMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          { name: '20141022202634_create_comments', batch: 1 },
          { name: '20141022202234_create_articles', batch: 1 },
        ]);
        expect(_.last(adapter.executedSQL)[0])
          .to.match(/select.*from "azul_migrations".*order by "name" desc/i);
      });
    });

  });

  describe('#_loadExecutedMigrations', function() {
    beforeEach(function() {
      return migration._transaction.begin();
    });
    afterEach(function() {
      return migration._transaction.commit();
    });

    it('loads migrations in order', function() {
      adapter.respondToMigrations([
        '20141022202234_create_articles',
      ]);

      return migration._loadExecutedMigrations().bind(this)
      .then(function(migrations) {
        expect(migrations).to.eql([
          _.extend({
            name: '20141022202234_create_articles',
            batch: 1,
          }, require('./fixtures/migrations/blog/' +
            '20141022202234_create_articles')),
        ]);
      });
    });

  });

  describe('with pending migrations stubbed', function() {
    beforeEach(function() {
      var mod1 = this.mod1 = {
        up: sinon.spy(), down: sinon.spy(),
        name: 'migration_file_1', batch: 1,
      };
      var mod2 = this.mod2 = {
        up: sinon.spy(), down: sinon.spy(),
        name: 'migration_file_2', batch: 1,
      };
      sinon.stub(migration, '_loadPendingMigrations')
        .returns(Promise.resolve([mod1, mod2]));
    });
    afterEach(function() {
      migration._loadPendingMigrations.restore();
    });

    describe('#migrate', function() {

      it('calls the up methods', function() {
        return migration.migrate().bind(this).then(function() {
          expect(this.mod1.up).to.have.been.calledOnce;
          expect(this.mod2.up).to.have.been.calledOnce;
        });
      });

      it('resolves with migration details', function() {
        return migration.migrate().then(function(migrations) {
          expect(_.map(migrations, 'batch')).to.eql([1, 1]);
          expect(_.map(migrations, 'name'))
            .to.eql(['migration_file_1', 'migration_file_2']);
        });
      });

      it('calls the up methods with the correct args', function() {
        return migration.migrate().bind(this).then(function() {
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
        });
      });

      it('does not call the down methods', function() {
        return migration.migrate().bind(this).then(function() {
          expect(this.mod1.down).to.not.have.been.called;
          expect(this.mod2.down).to.not.have.been.called;
        });
      });

      it('respects migration promises', function() {
        var sequence = 0;
        var up1Sequence;
        var up2Sequence;

        this.mod1.up = function() {
          return Promise.delay(5).then(function() {
            up1Sequence = sequence++;
          });
        };
        this.mod2.up = function() {
          return Promise.delay(0).then(function() {
            up2Sequence = sequence++;
          });
        };

        return migration.migrate().then(function() {
          expect(up1Sequence).to.eql(0);
          expect(up2Sequence).to.eql(1);
        });
      });

      it('rolls back transaction for failed migration', function() {
        this.mod2.up = function() {
          throw new Error('Intentional Error');
        };
        return migration.migrate().throw('Migration should have been rolled back.')
        .catch(function(e) {
          expect(e.message).to.eql('Intentional Error');
          adapter.should.have.executed(
            'BEGIN',
            'ROLLBACK');
        });
      });

      it('raises a descriptive error if rollback fails', function() {
        adapter.fail(/rollback/i);
        this.mod2.up = function() {
          throw new Error('Intentional Error');
        };
        return migration.migrate().throw('Migration should have been rolled back.')
        .catch(function(e) {
          expect(e.message)
            .to.match(/intentional error.*rollback.*fakefail.*rollback/i);
          adapter.should.have.executed('BEGIN');
          adapter.should.have.attempted('BEGIN', 'ROLLBACK');
        });
      });

      it('records migrations in database', function() {
        return migration.migrate().bind(this).then(function() {
          adapter.should.have.executed(
            'BEGIN',
            'INSERT INTO "azul_migrations" ("name", "batch") ' +
              'VALUES (?, ?), (?, ?)',
              ['migration_file_1', 1, 'migration_file_2', 1],
            'COMMIT');
        });
      });
    });
  });

  describe('with pending migrations stubbed as empty', function() {
    beforeEach(function() {
      sinon.stub(migration, '_loadPendingMigrations')
        .returns(Promise.resolve([]));
    });
    afterEach(function() {
      migration._loadPendingMigrations.restore();
    });

    describe('#migrate', function() {

      it('does not record migrations in database', function() {
        return migration.migrate().bind(this).then(function() {
          adapter.should.have.executed(
            'BEGIN',
            'COMMIT');
        });
      });

    });

  });

  describe('with executed migrations stubbed', function() {
    beforeEach(function() {
      var mod1 = this.mod1 = {
        up: sinon.spy(), down: sinon.spy(),
        name: 'migration_file_1', batch: 1,
      };
      var mod2 = this.mod2 = {
        up: sinon.spy(), down: sinon.spy(),
        name: 'migration_file_2', batch: 1,
      };
      var mods = this.mods = [mod2, mod1];
      sinon.stub(migration, '_loadExecutedMigrations')
        .returns(Promise.resolve(mods));
    });
    afterEach(function() {
      migration._loadExecutedMigrations.restore();
    });

    describe('#rollback', function() {

      it('calls the down methods', function() {
        return migration.rollback().bind(this).then(function() {
          expect(this.mod1.down).to.have.been.calledOnce;
          expect(this.mod2.down).to.have.been.calledOnce;
        });
      });

      it('resolves with migration details', function() {
        return migration.rollback().then(function(migrations) {
          expect(_.map(migrations, 'batch')).to.eql([1, 1]);
          expect(_.map(migrations, 'name'))
            .to.eql(['migration_file_2', 'migration_file_1']);
        });
      });

      it('works when there are no migrations to run', function() {
        this.mods.splice(0, 2);
        return migration.rollback().bind(this).then(function() {
          expect(this.mod1.down).to.not.have.been.called;
          expect(this.mod2.down).to.not.have.been.called;
        });
      });

      it('calls the down methods with the correct args', function() {
        return migration.rollback().bind(this).then(function() {
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
        });
      });

      it('does not call the up methods', function() {
        return migration.rollback().bind(this).then(function() {
          expect(this.mod1.up).to.not.have.been.called;
          expect(this.mod2.up).to.not.have.been.called;
        });
      });

      it('respects migration promises', function() {
        var sequence = 0;
        var down1Sequence;
        var down2Sequence;

        this.mod1.down = function() {
          return Promise.delay(0).then(function() {
            down1Sequence = sequence++;
          });
        };
        this.mod2.down = function() {
          return Promise.delay(5).then(function() {
            down2Sequence = sequence++;
          });
        };

        return migration.rollback().then(function() {
          expect(down1Sequence).to.eql(1);
          expect(down2Sequence).to.eql(0); // executed 1st
        });
      });

      it('rolls back transaction for failed migration', function() {
        this.mod1.down = function() {
          throw new Error('Intentional Error');
        };
        return migration.rollback().throw('Migration should have been rolled back.')
        .catch(function(e) {
          expect(e.message).to.eql('Intentional Error');
          adapter.should.have.executed(
            'BEGIN',
            'ROLLBACK');
        });
      });

      it('raises a descriptive error if rollback fails', function() {
        adapter.fail(/rollback/i);
        this.mod1.down = function() {
          throw new Error('Intentional Error');
        };
        return migration.rollback().throw('Rollback should have been rolled back.')
        .catch(function(e) {
          expect(e.message)
            .to.match(/intentional error.*rollback.*fakefail.*rollback/i);
          adapter.should.have.executed('BEGIN');
          adapter.should.have.attempted('BEGIN', 'ROLLBACK');
        });
      });

      it('removes migrations recorded in database', function() {
        return migration.rollback().bind(this).then(function() {
          adapter.should.have.executed(
            'BEGIN',
            'DELETE FROM "azul_migrations" WHERE "batch" = ?', [1],
            'COMMIT');
        });
      });
    });
  });

  describe('with pending reversible migrations stubbed', function() {
    beforeEach(function() {
      var cols = function(table) { table.string('name'); };
      var mod1 = this.mod1 = {
        change: sinon.spy(function(schema) {
          schema.createTable('example1', cols);
          schema.createTable('example2', cols);
        }),
        name: 'migration_file_1', batch: 1,
      };
      var mod2 = this.mod2 = {
        change: sinon.spy(function(schema) {
          schema.createTable('example3', cols);
        }),
        name: 'migration_file_2', batch: 1,
      };
      sinon.stub(migration, '_loadPendingMigrations')
        .returns(Promise.resolve([mod1, mod2]));
    });
    afterEach(function() {
      migration._loadPendingMigrations.restore();
    });

    it('runs all expected queries on migrate', function() {
        return migration.migrate().then(function(/*migrations*/) {
          adapter.should.have.executed(
            'BEGIN',
            'CREATE TABLE "example1" ("id" serial PRIMARY KEY, ' +
              '"name" varchar(255))',
            'CREATE TABLE "example2" ("id" serial PRIMARY KEY, ' +
              '"name" varchar(255))',
            'CREATE TABLE "example3" ("id" serial PRIMARY KEY, ' +
              '"name" varchar(255))',
            'INSERT INTO "azul_migrations" ("name", "batch") ' +
             'VALUES (?, ?), (?, ?)', [
               'migration_file_1', 1, 'migration_file_2', 1,],
            'COMMIT');
        });
    });

    it('fails if not serial', function() {
      this.mod1.change = function() {
        return Promise.resolve();
      };
      return migration.migrate()
      .throw(new Error('Expected migration to fail'))
      .catch(function(e) {
        expect(e).to.match(/reversible.*must.*serial/i);
      });
    });

    it('does not provide a query argument', function() {
      return migration.migrate().then(function(/*migrations*/) {
        expect(this.mod1.change.getCall(0).args[1]).to.not.exist;
      }.bind(this));
    });
  });

  describe('with executed reversible migrations stubbed', function() {
    beforeEach(function() {
      var cols = function(table) { table.string('name'); };
      var mod1 = this.mod1 = {
        change: sinon.spy(function(schema) {
          schema.createTable('example1', cols);
          schema.createTable('example2', cols);
        }),
        name: 'migration_file_1', batch: 1,
      };
      var mod2 = this.mod2 = {
        change: sinon.spy(function(schema) {
          schema.createTable('example3', cols);
        }),
        name: 'migration_file_2', batch: 1,
      };
      sinon.stub(migration, '_loadExecutedMigrations')
        .returns(Promise.resolve([mod2, mod1]));
    });
    afterEach(function() {
      migration._loadExecutedMigrations.restore();
    });

    it('runs all expected queries on rollback', function() {
        return migration.rollback().then(function(/*migrations*/) {
          adapter.should.have.executed(
            'BEGIN',
            'DROP TABLE "example3"',
            'DROP TABLE "example2"',
            'DROP TABLE "example1"',
            'DELETE FROM "azul_migrations" WHERE "batch" = ?', [1],
            'COMMIT');
        });
    });

    it('does not provide a query argument', function() {
      return migration.rollback().then(function(/*migrations*/) {
        expect(this.mod1.change.getCall(0).args[1]).to.not.exist;
      }.bind(this));
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
        name: 'migration_file_1', batch: 1,
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
        name: 'migration_file_2', batch: 1,
      };
      sinon.stub(migration, '_loadPendingMigrations')
        .returns(Promise.resolve([mod1, mod2]));
    });
    afterEach(function() {
      migration._loadPendingMigrations.restore();
    });

    it('runs all expected queries', function() {
        return migration.migrate().then(function(/*migrations*/) {
          adapter.should.have.executed(
            'BEGIN',
            'UPDATE "example0" SET "id" = ?', [0],
            'CREATE TABLE "example1" ("id" integer PRIMARY KEY)',
            'CREATE TABLE "example2" ("id" integer PRIMARY KEY)',
            'CREATE TABLE "example3" ("id" integer PRIMARY KEY)',
            'INSERT INTO "azul_migrations" ("name", "batch") ' +
             'VALUES (?, ?), (?, ?)', [
               'migration_file_1', 1, 'migration_file_2', 1,],
            'COMMIT');
        });
    });
  });

  describe('with pending migrations executing queries in simple query', function() {
    beforeEach(function() {
      var mod = this.mod = {
        up: sinon.spy(function(schema, query) {
          query.update('users', { id: 5 }).execute();
        }),
        down: sinon.spy(function(/*schema*/) {}),
        name: 'migration_file_1', batch: 1,
      };
      sinon.stub(migration, '_loadPendingMigrations')
        .returns(Promise.resolve([mod]));
    });
    afterEach(function() {
      migration._loadPendingMigrations.restore();
    });

    it('informs the user this is invalid', function() {
        return migration.migrate()
        .throw(new Error('Expected migration to fail.'))
        .catch(function(e) {
          expect(e).to.match(/serial migration.*must not execute/i);
        });
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
        name: 'migration_file_1', batch: 1,
      };
      sinon.stub(migration, '_loadPendingMigrations')
        .returns(Promise.resolve([mod]));
    });
    afterEach(function() {
      migration._loadPendingMigrations.restore();
    });

    it('informs the user this is invalid', function() {
        return migration.migrate()
        .throw(new Error('Expected migration to fail.'))
        .catch(function(e) {
          expect(e).to.match(/serial migration.*must not re-use/i);
        });
    });
  });

  describe('with pending migrations spawning queries', function() {
    beforeEach(function() {
      var mod = this.mod = {
        up: sinon.spy(function(schema, query) {
          var q = query.update('users');
          q.set({ id: 5 });
          q.set({ id: 6 });
          return Promise.resolve();
        }),
        down: sinon.spy(function(/*schema*/) {}),
        name: 'migration_file_1', batch: 1,
      };
      sinon.stub(migration, '_loadPendingMigrations')
        .returns(Promise.resolve([mod]));
    });
    afterEach(function() {
      migration._loadPendingMigrations.restore();
    });

    it('does not run queries', function() {
        return migration.migrate().then(function(/*migrations*/) {
          adapter.should.have.executed(
            'BEGIN',
            'INSERT INTO "azul_migrations" ("name", "batch") ' +
             'VALUES (?, ?)', ['migration_file_1', 1],
            'COMMIT');
        });
    });
  });
}));
