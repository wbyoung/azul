'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var ModelQuery = require('../../lib/query/model');
var FakeAdapter = require('../fakes/adapter');

var db,
  adapter;

describe('ModelQuery', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
  });

  it('cannot be created directly', function() {
    expect(function() {
      ModelQuery.create();
    }).to.throw(/ModelQuery must be spawned/i);
  });

  it('gives a useful error when bad attr is used in `where`', function() {
    expect(function() {
      db.query.bindModel(db.model('user')).where({ invalidAttr: 'value' }).all();
    }).to.throw(/invalid field.*"invalidAttr".*user query.*user class/i);
  });

  it('gives a useful error when bad relation is used for `with`', function() {
    expect(function() {
      db.query.bindModel(db.model('user')).with('streets');
    }).to.throw(/no relation.*"streets".*with.*user query/i);
  });

  it('gives a useful error when bad relation is used for `join`', function() {
    expect(function() {
      db.query.bindModel(db.model('user')).join('streets');
    }).to.throw(/no relation.*"streets".*join.*user query/i);
  });
});
