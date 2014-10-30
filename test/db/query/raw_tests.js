'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));

var Database = require('../../../lib/db');
var RawQuery = require('../../../lib/db/query/raw');
var MockAdapter = require('../../mocks/adapter');
var Statement = require('../../../lib/db/grammar/statement');
var BluebirdPromise = require('bluebird');

var db;

describe('RawQuery', function() {
  before(function() {
    db = Database.create({ adapter: MockAdapter.create({}) });
  });

  it('cannot be created directly', function() {
    expect(function() {
      RawQuery.create();
    }).to.throw(/RawQuery must be spawned/i);
  });

  it('can be created with a statement', function() {
    var statement = Statement.create('SELECT * FROM "jobs"', []);
    expect(db.query.raw(statement).sql()).to.eql(statement);
  });

  it('cannot be created with a statement and args', function() {
    var statement = Statement.create('SELECT * FROM "jobs"', []);
    expect(function() { db.query.raw(statement, []); })
      .to.throw(/not provide.*statement.*args/i);
  });

  it('can be created without args', function() {
    expect(db.query.raw('SELECT * FROM "jobs"').sql()).to.eql(Statement.create(
      'SELECT * FROM "jobs"', []
    ));
  });

  it('can be created args', function() {
    var query = db.query.raw('SELECT * FROM "jobs" where "id" = ?', [1]);
    expect(query.sql()).to.eql(Statement.create(
      'SELECT * FROM "jobs" where "id" = ?', [1]
    ));
  });

  it('can be duplicated', function() {
    var query = db.query.raw('SELECT * FROM "jobs" where "id" = ?', [1]);
    var dup = query._dup();
    expect(_.pick(query, '_sql', '_args'))
      .to.eql(_.pick(dup, '_sql', '_args'));
    expect(query._args).to.not.equal(dup._args);
    expect(query).to.not.equal(dup);
  });

  describe('from db', function() {
    var query;

    beforeEach(function() {
      query = db.query.raw('select * from "jobs"');
      sinon.spy(query._adapter, 'execute');
    });

    afterEach(function() {
      query._adapter.execute.restore();
    });

    it('will not execute more than once', function(done) {
      BluebirdPromise.settle([
        query.execute(),
        query.execute(),
        query.execute()
      ]).then(function() {
        expect(query._adapter.execute).to.have.been.calledOnce;
      })
      .done(done, done);
    });
  });

});
