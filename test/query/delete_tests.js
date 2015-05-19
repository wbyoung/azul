'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var DeleteQuery = require('../../lib/query/delete');
var FakeAdapter = require('../fakes/adapter');
var Statement = require('../../lib/types/statement');

var db;

describe('DeleteQuery', function() {
  before(function() {
    db = Database.create({ adapter: FakeAdapter.create({}) });
  });

  it('cannot be created directly', function() {
    expect(function() {
      DeleteQuery.create();
    }).to.throw(/DeleteQuery must be spawned/i);
  });

  it('deletes data', function() {
    expect(db.delete('users').statement).to.eql(Statement.create(
      'DELETE FROM "users"', []
    ));
  });

  it('can be filtered', function() {
    expect(db.delete('users').where({ id: 1 }).statement).to.eql(Statement.create(
      'DELETE FROM "users" WHERE "id" = ?', [1]
    ));
  });
});
