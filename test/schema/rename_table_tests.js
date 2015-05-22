'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var RenameTableQuery = require('../../lib/schema/table/rename');
var FakeAdapter = require('../fakes/adapter');

var db, adapter;

describe('RenameTableQuery', function() {
  before(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
  });

  it('cannot be created directly', function() {
    expect(function() {
      RenameTableQuery.create();
    }).to.throw(/RenameTableQuery must be spawned/i);
  });

  it('generates the proper query', function() {
    var query = db.schema.renameTable('users', 'profiles');
    expect(query.sql).to.eql('ALTER TABLE "users" RENAME TO "profiles"');
    expect(query.args).to.eql([]);
  });

  it('generates the proper query when cloned', function() {
    var query = db.schema.renameTable('users', 'profiles').clone();
    expect(query.sql).to.eql('ALTER TABLE "users" RENAME TO "profiles"');
    expect(query.args).to.eql([]);
  });
});
