'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../../lib/db');
var BoundQuery = require('../../../lib/db/query/bound');
var FakeAdapter = require('../../fakes/adapter');
var Statement = require('../../../lib/db/grammar/statement');

var db;

describe('BoundQuery', function() {
  before(function() {
    db = Database.create({ adapter: FakeAdapter.create({}) });
  });

  it('cannot be created directly', function() {
    expect(function() {
      BoundQuery.create();
    }).to.throw(/BoundQuery must be spawned/i);
  });

  it('defaults to selecting data', function() {
    var query = db.query.bind('users');
    expect(query.sql()).to.eql(Statement.create(
      'SELECT * FROM "users"', []
    ));
  });

  it('selects data', function() {
    var query = db.query.bind('users').all();
    expect(query.sql()).to.eql(Statement.create(
      'SELECT * FROM "users"', []
    ));
  });

  it('inserts data', function() {
    var query = db.query.bind('users').insert({ name: 'Whitney' });
    expect(query.sql()).to.eql(Statement.create(
      'INSERT INTO "users" ("name") VALUES (?)', ['Whitney']
    ));
  });

  it('updates data', function() {
    var query = db.query.bind('users').update({ name: 'Whitney' });
    expect(query.sql()).to.eql(Statement.create(
      'UPDATE "users" SET "name" = ?', ['Whitney']
    ));
  });

  it('deletes data', function() {
    var query = db.query.bind('users').delete();
    expect(query.sql()).to.eql(Statement.create(
      'DELETE FROM "users"', []
    ));
  });

  it('executes raw queries', function() {
    var query = db.query.bind('users').raw('SELECT * FROM "users"');
    expect(query.sql()).to.eql(Statement.create(
      'SELECT * FROM "users"', []
    ));
  });
});
