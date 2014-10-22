'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));

var Database = require('../../../lib/db');
var MockAdapter = require('../../mocks/adapter');
var Statement = require('../../../lib/db/grammar/statement');
var RawQuery = require('../../../lib/db/query/raw');

var db;

describe('Transaction Mixin', function() {
  before(function() {
    db = Database.create({ adapter: MockAdapter.create({}) });
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

  it('cannot use commit without transaction', function(done) {
    db.query.commit().execute().bind(this)
    .throw(new Error('Expected query execution to fail.'))
    .catch(function(e) {
      expect(e).to.match(/must associate.*commit.*with.*transaction/i);
    })
    .done(done, done);
  });

  it('cannot use rollback without transaction', function(done) {
    db.query.rollback().execute().bind(this)
    .throw(new Error('Expected query execution to fail.'))
    .catch(function(e) {
      expect(e).to.match(/must associate.*rollback.*with.*transaction/i);
    })
    .done(done, done);
  });

  describe('when begun', function() {
    beforeEach(function() { this.transaction = db.query.begin(); });

    it('is a query', function() {
      expect(this.transaction).to.be.an.instanceOf(RawQuery.__class__);
    });

    it('includes sql', function() {
      expect(this.transaction.sql()).to.eql(Statement.create(
        'BEGIN', []
      ));
    });

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

    it('preforms commit with same client', function(done) {
      this.transaction.execute().bind(this).then(function() {
        return this.transaction.commit();
      })
      .then(function() {
        var client = this.transaction.client();
        expect(db._adapter._execute).to.have.been
          .calledWithExactly(client, 'COMMIT', []);
      })
      .done(done, done);
    });

    it('preforms rollback with same client', function(done) {
      this.transaction.execute().bind(this).then(function() {
        return this.transaction.rollback();
      })
      .then(function() {
        var client = this.transaction.client();
        expect(db._adapter._execute).to.have.been
          .calledWithExactly(client, 'ROLLBACK', []);
      })
      .done(done, done);
    });

    it('can be committed with transaction specified later', function(done) {
      this.transaction.execute().bind(this).then(function() {
        return db.query.commit().transaction(this.transaction);
      })
      .then(function() {
        var client = this.transaction.client();
        expect(db._adapter._execute).to.have.been
          .calledWithExactly(client, 'COMMIT', []);
      })
      .done(done, done);
    });

    it('can be rolled back with transaction specified later', function(done) {
      this.transaction.execute().bind(this).then(function() {
        return db.query.rollback().transaction(this.transaction);
      })
      .then(function() {
        var client = this.transaction.client();
        expect(db._adapter._execute).to.have.been
          .calledWithExactly(client, 'ROLLBACK', []);
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
          .calledWithExactly(this.transaction.client());
      })
      .done(done, done);
    });

    it('cannot use commit before begin', function(done) {
      this.transaction.commit().execute().bind(this)
      .throw(new Error('Expected query execution to fail.'))
      .catch(function(e) {
        expect(e).to.match(/must execute.*begin/i);
      })
      .done(done, done);
    });

    it('cannot use rollback before begin', function(done) {
      this.transaction.rollback().execute().bind(this)
      .throw(new Error('Expected query execution to fail.'))
      .catch(function(e) {
        expect(e).to.match(/must execute.*begin/i);
      })
      .done(done, done);
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
          var client = this.transaction.client();
          expect(client).to.exist;
          expect(this.transaction._transactionClientPromise.isFulfilled())
            .to.be.true;
        });

        it('passes transaction client to adapter', function() {
          var client = this.transaction.client();
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
