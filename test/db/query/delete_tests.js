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
});
