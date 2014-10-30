'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../../lib/db');
var CreateTableQuery = require('../../../lib/db/schema/table/create');
var MockAdapter = require('../../mocks/adapter');

var db, adapter;

describe('CreateTableQuery', function() {
  before(function() {
    adapter = MockAdapter.create({});
    db = Database.create({ adapter: adapter });
  });

  it('cannot be created directly', function() {
    expect(function() {
      CreateTableQuery.create();
    }).to.throw(/CreateTableQuery must be spawned/i);
  });

  it('must provide a callback', function() {
    expect(function() {
      db.schema.createTable('users');
    }).to.throw(/missing callback/i);
  });
});
