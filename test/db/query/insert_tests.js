'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));

var Database = require('../../../lib/db');
var MockAdapter = require('../../mocks/adapter');
var Statement = require('../../../lib/db/grammar/statement');
var RawQuery = require('../../../lib/db/query/raw');
var Condition = require('../../../lib/db/condition'),
  f = Condition.f;

var db;

describe('query', function() {
  before(function() {
    db = Database.create({ adapter: MockAdapter.create({}) });
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
});
