'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../../lib/db');
var MockAdapter = require('../../mocks/adapter');
var Statement = require('../../../lib/db/grammar/statement');

var db;

describe('DeleteQuery', function() {
  before(function() {
    db = Database.create({ adapter: MockAdapter.create({}) });
  });

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
