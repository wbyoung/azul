'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../../lib/db');
var DropTableQuery = require('../../../lib/db/schema/table/drop');
var MockAdapter = require('../../mocks/adapter');

var db, adapter;

describe('DropTableQuery', function() {
  before(function() {
    adapter = MockAdapter.create({});
    db = Database.create({ adapter: adapter });
  });

  it('cannot be created directly', function() {
    expect(function() {
      DropTableQuery.create();
    }).to.throw(/DropTableQuery must be spawned/i);
  });
});
