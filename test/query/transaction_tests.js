'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));

var Database = require('../../lib/database');
var TransactionQuery = require('../../lib/query/transaction');
var FakeAdapter = require('../fakes/adapter');
var Statement = require('../../lib/types/statement');
var BaseQuery = require('../../lib/query/base');
var Promise = require('bluebird');

var db;

describe('Transaction Mixin', function() {
  before(function() {
    db = Database.create({ adapter: FakeAdapter.create({}) });
  });

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

  it('cannot be created directly', function() {
    expect(function() {
      TransactionQuery.create();
    }).to.throw(/TransactionQuery must be spawned/i);
  });

  it('contains begin query that cannot be created directly', function() {
    expect(function() {
      TransactionQuery.BeginQuery.create();
    }).to.throw(/BeginQuery must be spawned/i);
  });

  it('contains commit query that cannot be created directly', function() {
    expect(function() {
      TransactionQuery.CommitQuery.create();
    }).to.throw(/CommitQuery must be spawned/i);
  });

  it('contains rollback query that cannot be created directly', function() {
    expect(function() {
      TransactionQuery.RollbackQuery.create();
    }).to.throw(/RollbackQuery must be spawned/i);
  });

  describe('when begun', function() {
    beforeEach(function() {
      this.transaction = db.transaction();
      this.begin = this.transaction.begin();
    });

    it('is a query', function() {
      expect(this.transaction).to.be.an.instanceOf(BaseQuery.__class__);
      expect(this.begin).to.be.an.instanceOf(BaseQuery.__class__);
    });

    it('does not allow transaction calls after begin', function() {
      expect(this.begin.transaction).to.not.exist;
      expect(this.begin.begin).to.not.exist;
    });

    it('includes sql', function() {
      expect(this.begin.statement).to.eql(Statement.create(
        'BEGIN', []
      ));
    });

    it('can be committed', function(done) {
      this.begin.execute().bind(this).then(function() {
        var commit = this.transaction.commit();
        expect(commit.statement).to.eql(Statement.create('COMMIT', []));
      })
      .done(done, done);
    });

    it('can be rolled back', function(done) {
      this.begin.execute().bind(this).then(function() {
        var rollback = this.transaction.rollback();
        expect(rollback.statement).to.eql(Statement.create('ROLLBACK', []));
      })
      .done(done, done);
    });

    it('preforms commit with same client', function(done) {
      this.begin.execute().bind(this)
      .then(function() { return this.transaction.acquireClient(); })
      .then(function(client) { this.client = client; })
      .then(function() {
        return this.transaction.commit();
      })
      .then(function() {
        expect(db._adapter._execute).to.have.been
          .calledWithExactly(this.client, 'COMMIT', []);
      })
      .done(done, done);
    });

    it('preforms rollback with same client', function(done) {
      this.begin.execute().bind(this)
      .then(function() { return this.transaction.acquireClient(); })
      .then(function(client) { this.client = client; })
      .then(function() {
        return this.transaction.rollback();
      })
      .then(function() {
        expect(db._adapter._execute).to.have.been
          .calledWithExactly(this.client, 'ROLLBACK', []);
      })
      .done(done, done);
    });

    it('performs duplicated commits with the same client', function(done) {
      this.begin.execute().bind(this)
      .then(function() { return this.transaction.acquireClient(); })
      .then(function(client) { this.client = client; })
      .then(function() {
        return this.transaction.commit().clone();
      })
      .then(function() {
        expect(db._adapter._execute).to.have.been
          .calledWithExactly(this.client, 'COMMIT', []);
      })
      .done(done, done);
    });

    it('releases client back to pool on commit', function(done) {
      this.begin.execute().bind(this)
      .then(function() { return this.transaction.acquireClient(); })
      .then(function() {
        return this.transaction.commit();
      })
      .then(function() {
        expect(db._adapter.pool.acquire).to.have.been.calledOnce;
        expect(db._adapter.pool.release).to.have.been.calledOnce;
        expect(db._adapter.pool.release).to.have.been
          .calledWithExactly(this.client);
      })
      .done(done, done);
    });

    it('cannot use commit before begin', function(done) {
      this.transaction.commit().execute().bind(this)
      .throw(new Error('Expected query execution to fail.'))
      .catch(function(e) {
        expect(e).to.match(/execute.*transaction.*not open/i);
      })
      .done(done, done);
    });

    it('cannot use rollback before begin', function(done) {
      this.transaction.rollback().execute().bind(this)
      .throw(new Error('Expected query execution to fail.'))
      .catch(function(e) {
        expect(e).to.match(/execute.*transaction.*not open/i);
      })
      .done(done, done);
    });

    it('cannot execute query before begin', function(done) {
      db.select('users').transaction(this.transaction).execute().bind(this)
      .throw(new Error('Expected query execution to fail.'))
      .catch(function(e) {
        expect(e).to.match(/execute.*transaction.*not open/i);
      })
      .done(done, done);
    });

    it('cannot over-commit', function(done) {
      this.begin.execute().bind(this)
      .then(function() { return this.transaction.commit(); })
      .then(function() { return this.transaction.commit(); })
      .throw(new Error('Expected query execution to fail.'))
      .catch(function(e) {
        expect(e).to.match(/execute.*transaction.*not open/i);
      })
      .done(done, done);
    });

    describe('a select that uses the transaction', function() {
      beforeEach(function() {
        this.selectQuery = db.select('users').transaction(this.transaction);
      });

      it('generates standard sql', function() {
        expect(this.selectQuery.statement).to.eql(Statement.create(
          'SELECT * FROM "users"', []
        ));
      });

      it('shares the transaction', function() {
        expect(this.selectQuery.transaction()).to.equal(this.transaction);
      });

      it('cannot run if initial transaction was committed', function(done) {
        this.begin.execute().bind(this).then(function() {
          return this.transaction.commit();
        })
        .then(function() {
          return this.selectQuery.execute();
        })
        .throw(new Error('Expected query execution to fail.'))
        .catch(function(e) {
          expect(e).to.match(/execute.*transaction.*not open/i);
        })
        .done(done, done);
      });

      describe('when executed', function() {
        beforeEach(function() {
          sinon.spy(this.transaction, 'acquireClient');
        });
        afterEach(function() {
          this.transaction.acquireClient.restore();
        });

        beforeEach(function(done) {
          this.begin.execute().then(function() { done(); }, done);
        });

        beforeEach(function(done) {
          this.selectQuery.execute().then(function() { done(); }, done);
        });

        it('first acquires a client', function() {
          var acquireClient = this.transaction.acquireClient;
          var promise = acquireClient.getCall(0).returnValue;
          expect(acquireClient).to.have.been.called;
          expect(promise.isFulfilled()).to.be.true;
        });

        it('passes transaction client to adapter', function() {
          var acquireClient = this.transaction.acquireClient;
          var promise = acquireClient.getCall(0).returnValue;
          var client = promise.value();
          expect(db._adapter._execute).to.have.been
            .calledWithExactly(client, 'SELECT * FROM "users"', []);
        });
      });
    });

    it('can be nested', function(done) {
      // note that we're intentionally not executing this.begin in this test &
      // expect that everything will still work as expected.
      var txn = this.transaction;
      var query = db.query.transaction(txn);
      var client;
      Promise.resolve()
      .then(function() { return txn.begin(); })
      .then(function() { return txn.acquireClient(); })
      .then(function(_client) { client = _client; })
      .then(function() { return query.select('users'); })
      .then(function() { return txn.begin(); })
      .then(function() { return query.select('articles'); })
      .then(function() { return query.select('comments'); })
      .then(function() { return txn.commit(); })
      .then(function() { return txn.commit(); })
      .then(function() {
          expect(db._adapter._execute.getCall(0)).to.have.been
            .calledWithExactly(client, 'BEGIN', []);
          expect(db._adapter._execute.getCall(1)).to.have.been
            .calledWithExactly(client, 'SELECT * FROM "users"', []);
          expect(db._adapter._execute.getCall(2)).to.have.been
            .calledWithExactly(client, 'BEGIN', []);
          expect(db._adapter._execute.getCall(3)).to.have.been
            .calledWithExactly(client, 'SELECT * FROM "articles"', []);
          expect(db._adapter._execute.getCall(4)).to.have.been
            .calledWithExactly(client, 'SELECT * FROM "comments"', []);
          expect(db._adapter._execute.getCall(5)).to.have.been
            .calledWithExactly(client, 'COMMIT', []);
          expect(db._adapter._execute.getCall(6)).to.have.been
            .calledWithExactly(client, 'COMMIT', []);
      })
      .done(done, done);
    });
  });
});
