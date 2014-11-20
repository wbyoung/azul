'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var DropTableQuery = require('../../lib/schema/table/drop');
var FakeAdapter = require('../fakes/adapter');

var db, adapter;

describe('DropTableQuery', function() {
  before(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
  });

  it('cannot be created directly', function() {
    expect(function() {
      DropTableQuery.create();
    }).to.throw(/DropTableQuery must be spawned/i);
  });
});
