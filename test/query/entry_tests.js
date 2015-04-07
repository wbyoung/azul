'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var EntryQuery = require('../../lib/query/entry');
var FakeAdapter = require('../fakes/adapter');

var db, adapter;

describe('EntryQuery', function() {
  before(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
  });

  it('can be created directly', function() {
    expect(function() { EntryQuery.create(adapter); }).to.not.throw();
  });

  it('cannot generate sql', function() {
    expect(function() { db.query.statement; })
      .throw(/must first call.*`select`.*on query/i);
    expect(function() { db.query.statement; })
      .throw(/must first call.*`update`.*on query/i);
    expect(function() { db.query.statement; })
      .throw(/must first call.*`insert`.*on query/i);
    expect(function() { db.query.statement; })
      .throw(/must first call.*`delete`.*on query/i);
    expect(function() { db.query.statement; })
      .throw(/must first call.*`raw`.*on query/i);
  });
});
