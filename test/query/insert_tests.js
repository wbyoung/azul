'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var InsertQuery = require('../../lib/query/insert');
var FakeAdapter = require('../fakes/adapter');
var Statement = require('../../lib/types/statement');

var db;

describe('InsertQuery', function() {
  before(function() {
    db = Database.create({ adapter: FakeAdapter.create({}) });
  });

  it('cannot be created directly', function() {
    expect(function() {
      InsertQuery.create();
    }).to.throw(/InsertQuery must be spawned/i);
  });

  it('inserts data', function() {
    var query = db.insert('users', { name: 'Whitney' });
    expect(query.statement).to.eql(Statement.create(
      'INSERT INTO "users" ("name") VALUES (?)', ['Whitney']
    ));
  });

  it('inserts data via #values', function() {
    var query = db.insert('users').values({ name: 'Whitney' });
    expect(query.statement).to.eql(Statement.create(
      'INSERT INTO "users" ("name") VALUES (?)', ['Whitney']
    ));
  });

  it('inserts multiple data sets via #values', function() {
    var query = db.insert('users')
      .values({ name: 'Whitney' }, { name: 'Brittany' })
      .values({ name: 'Milo' });
    expect(query.statement).to.eql(Statement.create(
      'INSERT INTO "users" ("name") VALUES (?), (?), (?)',
      ['Whitney', 'Brittany', 'Milo']
    ));
  });

  it('inserts multiple sets of data', function() {
    var query = db.insert('users', [{ name: 'Whitney' }, { name: 'Brittany'}]);
    expect(query.statement).to.eql(Statement.create(
      'INSERT INTO "users" ("name") VALUES (?), (?)', ['Whitney', 'Brittany']
    ));
  });

  it('inserts multiple sets of with different keys', function() {
    var query = db.insert('users', [
      { name: 'Whitney',  address: 'Portland' },
      { name: 'Brittany'}
    ]);
    expect(query.statement).to.eql(Statement.create(
      'INSERT INTO "users" ("name", "address") VALUES (?, ?), (?, ?)',
      ['Whitney', 'Portland', 'Brittany', undefined]
    ));
  });

  it('allows specifying the return value', function() {
    var query = db.insert('users', [{ name: 'Whitney' }]).returning('id');
    expect(query.statement).to.eql(Statement.create(
      'INSERT INTO "users" ("name") VALUES (?) RETURNING "id"', ['Whitney']
    ));
  });

  it('throws when no attrs are given', function() {
    expect(function() {
      db.insert('users', {}).sql;
    }).to.throw(/insert.*missing values/i);
  });

  it('allows some value specification to be null', function() {
    var query = db.insert('users').values({ name: 'Whitney' }).values({});
    expect(query.statement).to.eql(Statement.create(
      'INSERT INTO "users" ("name") VALUES (?), (?)', ['Whitney', undefined]
    ));
  });
});
