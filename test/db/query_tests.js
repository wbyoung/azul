'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));

var Database = require('../../lib/db');
var MockAdapter = require('../mocks/adapter');
var Statement = require('../../lib/db/grammar/statement');
var RawQuery = require('../../lib/db/query/raw');
var Condition = require('../../lib/db/condition'),
  f = Condition.f;

var db;

describe('query', function() {
  before(function() {
    db = Database.create({ adapter: MockAdapter.create({}) });
  });

  describe('select', function() {

    it('accesses a table', function() {
      expect(db.select('users').sql()).to.eql(Statement.create(
        'SELECT * FROM "users"', []
      ));
    });

    it('can be filtered', function() {
      expect(db.select('users').where({ id: 1 }).sql()).to.eql(Statement.create(
        'SELECT * FROM "users" WHERE "id" = ?', [1]
      ));
    });

    it('can be filtered 2 times', function() {
      var result = db.select('users')
        .where({ id: 1 })
        .where({ name: 'Whitney' }).sql();
      expect(result).to.eql(Statement.create(
        'SELECT * FROM "users" WHERE ("id" = ?) AND "name" = ?', [1, 'Whitney']
      ));
    });

    it('can be filtered 3 times', function() {
      var result = db.select('users')
        .where({ id: 1 })
        .where({ name: 'Whitney' })
        .where({ city: 'Portland' }).sql();
      expect(result).to.eql(Statement.create(
        'SELECT * FROM "users" WHERE (("id" = ?) AND "name" = ?) AND "city" = ?', [1, 'Whitney', 'Portland']
      ));
    });

    it('handles predicates', function() {
      expect(db.select('articles').where({ 'words[gt]': 200 }).sql()).to.eql(Statement.create(
        'SELECT * FROM "articles" WHERE "words" > ?', [200]
      ));
    });

    describe('column specification', function() {
      it('accepts simple names', function() {
        expect(db.select('articles', ['title', 'body']).sql()).to.eql(Statement.create(
          'SELECT "title", "body" FROM "articles"', []
        ));
      });

      it('accepts simple table qualified names', function() {
        expect(db.select('articles', ['articles.title', 'body']).sql()).to.eql(Statement.create(
          'SELECT "articles"."title", "body" FROM "articles"', []
        ));
      });
    });

    describe('joins', function() {
      it('defaults to a cross join', function() {
        expect(db.select('articles').join('authors').sql()).to.eql(Statement.create(
          'SELECT * FROM "articles" CROSS JOIN "authors"', []
        ));
      });

      it('accepts type', function() {
        expect(db.select('articles').join('authors', 'inner').sql()).to.eql(Statement.create(
          'SELECT * FROM "articles" INNER JOIN "authors"', []
        ));
      });

      it('accepts conditions', function() {
        var result = db.select('articles').join('authors', { 'articles.author_id': f('authors.id') }).sql();
        expect(result.sql).to.match(/JOIN "authors" ON "articles"."author_id" = "authors"."id"$/);
      });

      it('accepts conditions as a simple string', function() {
        var result = db.select('articles').join('authors', 'articles.author_id=authors.id').sql();
        expect(result.sql).to.match(/JOIN "authors" ON "articles"."author_id" = "authors"."id"$/);
      });
    });

    // TODO: aggregation
    //   Avg
    //   Count
    //   Max
    //   Min
    //   StdDev
    //   Sum
    //   Variance


    it('is immutable', function() {
      var original = db.select('users');
      var filtered = original.where({ id: 2 });
      expect(original.sql()).to.not.eql(filtered.sql());
    });
  });

  describe('insert', function() {
    it('inserts data', function() {
      expect(db.insert('users', { name: 'Whitney' }).sql()).to.eql(Statement.create(
        'INSERT INTO "users" ("name") VALUES (?)', ['Whitney']
      ));
    });

    it('inserts data via #values', function() {
      expect(db.insert('users').values({ name: 'Whitney' }).sql()).to.eql(Statement.create(
        'INSERT INTO "users" ("name") VALUES (?)', ['Whitney']
      ));
    });

    it('inserts multiple data sets via #values', function() {
      var query = db.insert('users')
        .values({ name: 'Whitney' }, { name: 'Brittany' })
        .values({ name: 'Milo' });
      expect(query.sql()).to.eql(Statement.create(
        'INSERT INTO "users" ("name") VALUES (?), (?), (?)',
        ['Whitney', 'Brittany', 'Milo']
      ));
    });

    it('inserts multiple sets of data', function() {
      var query = db.insert('users', [{ name: 'Whitney' }, { name: 'Brittany'}]);
      expect(query.sql()).to.eql(Statement.create(
        'INSERT INTO "users" ("name") VALUES (?), (?)', ['Whitney', 'Brittany']
      ));
    });

    it('inserts multiple sets of with different keys', function() {
      var query = db.insert('users', [
        { name: 'Whitney',  address: 'Portland' },
        { name: 'Brittany'}
      ]);
      expect(query.sql()).to.eql(Statement.create(
        'INSERT INTO "users" ("name", "address") VALUES (?, ?), (?, ?)',
        ['Whitney', 'Portland', 'Brittany', undefined]
      ));
    });
  });

  describe('delete', function() {
    it('deletes data', function() {
      expect(db.delete('users').sql()).to.eql(Statement.create(
        'DELETE FROM "users"', []
      ));
    });

    it('can be filtered', function() {
      expect(db.delete('users').where({ id: 1 }).sql()).to.eql(Statement.create(
        'DELETE FROM "users" WHERE "id" = ?', [1]
      ));
    });
  });

  describe('transactions', function() {
    beforeEach(function(done) {
      // spy after pool has been set up. the only way to tell is to get a
      // client and release it.
      db._adapter.pool.acquireAsync().then(function(client) {
        db._adapter.pool.release(client);
        sinon.spy(db._adapter, '_execute');
        sinon.spy(db._adapter.pool, 'acquire');
        sinon.spy(db._adapter.pool, 'release');
      })
      .done(done, done);
    });
    afterEach(function() {
      db._adapter._execute.restore();
      db._adapter.pool.acquire.restore();
      db._adapter.pool.release.restore();
    });

    describe('when begun', function() {
      beforeEach(function() { this.transaction = db.query.begin(); });

      it('can be committed', function(done) {
        this.transaction.execute().bind(this).then(function() {
          var commit = this.transaction.commit();
          expect(commit.sql()).to.eql(Statement.create('COMMIT', []));
        })
        .done(done, done);
      });

      it('can be rolled back', function(done) {
        this.transaction.execute().bind(this).then(function() {
          var rollback = this.transaction.rollback();
          expect(rollback.sql()).to.eql(Statement.create('ROLLBACK', []));
        })
        .done(done, done);
      });

      it('releases client back to pool on commit', function(done) {
        this.transaction.execute().bind(this).then(function() {
          return this.transaction.commit();
        })
        .then(function() {
          expect(db._adapter.pool.acquire).to.have.been.calledOnce;
          expect(db._adapter.pool.release).to.have.been.calledOnce;
          expect(db._adapter.pool.release).to.have.been
            .calledWithExactly(this.transaction._client);
        })
        .done(done, done);
      });

      it('is a query', function() {
        expect(this.transaction).to.be.an.instanceOf(RawQuery.__class__);
      });

      it('includes sql', function() {
        expect(this.transaction.sql()).to.eql(Statement.create(
          'BEGIN', []
        ));
      });

      it('must be executed before executing queries based off of it', function(done) {
        this.transaction.select('users').execute()
        .throw(new Error('Expected query execution to fail.'))
        .catch(function(e) {
          expect(e).to.match(/must execute.*begin/i);
        })
        .done(done, done);
      });

      var shouldWorkWithCurrentSelectQuery = function(){

        it('generates standard sql', function() {
          expect(this.selectQuery.sql()).to.eql(Statement.create(
            'SELECT * FROM "users"', []
          ));
        });

        it('shares the transaction', function() {
          expect(this.selectQuery._transaction).to.equal(this.transaction);
        });

        it('cannot run if initial transaction was committed', function(done) {
          this.transaction.execute().bind(this).then(function() {
            return this.transaction.commit();
          })
          .then(function() {
            return this.selectQuery.execute();
          })
          .throw(new Error('Expected query execution to fail.'))
          .catch(function(e) {
            expect(e).to.match(/cannot execute query.*committed.*transaction/i);
          })
          .done(done, done);
        });

        describe('when executed', function() {
          beforeEach(function(done) {
            this.transaction.execute().then(function() { done(); }, done);
          });

          beforeEach(function(done) {
            this.selectQuery.execute().then(function() { done(); }, done);
          });

          it('first acquires a client', function() {
            var client = this.transaction._client;
            expect(client).to.exist;
            expect(this.transaction._clientPromise.isFulfilled()).to.be.true;
          });

          it('passes transaction to adapter', function() {
            var client = this.transaction._client;
            expect(db._adapter._execute).to.have.been
              .calledWithExactly(client, 'SELECT * FROM "users"', []);
          });
        });
      };

      describe('a select that uses the transaction', function() {
        beforeEach(function() {
          this.selectQuery = db.select('users').transaction(this.transaction);
        });

        shouldWorkWithCurrentSelectQuery();
      });

      describe('a select created from the transaction', function() {
        beforeEach(function() {
          this.selectQuery = this.transaction.select('users');
        });

        shouldWorkWithCurrentSelectQuery();
      });

      it('can be nested');
    });
  });
});
