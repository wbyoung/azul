'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var CreateTableQuery = require('../../lib/schema/table/create');
var FakeAdapter = require('../fakes/adapter');
var Statement = require('../../lib/grammar/statement');

var db, adapter;

describe('CreateTableQuery', function() {
  before(function() {
    adapter = FakeAdapter.create({});
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

  it('generates primary key columns via `pk`', function() {
    var query = db.schema.createTable('users', function(table) {
      table.integer('id').pk();
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("id" integer PRIMARY KEY)', []
    ));
  });

  it('generates primary key columns via `primarykey`', function() {
    var query = db.schema.createTable('users', function(table) {
      table.integer('id').primaryKey();
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("id" integer PRIMARY KEY)', []
    ));
  });

  it('does not allow more than one primary key', function() {
    expect(function() {
      db.schema.createTable('users', function(table) {
        table.integer('id').pk();
        table.integer('id2').pk();
      });
    }).to.throw(/only.*one primary key/);
  });

  it('generates not null columns', function() {
    var query = db.schema.createTable('users', function(table) {
      table.integer('id').notNull();
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("id" integer NOT NULL)', []
    ));
  });

  // this will likely need to be done via a separate query and not when setting
  // up the table.
  it.skip('generates indexed columns');

  it('generates unique columns', function() {
    var query = db.schema.createTable('users', function(table) {
      table.integer('id').unique();
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("id" integer UNIQUE)', []
    ));
  });

  it('generates columns with defaults', function() {
    var query = db.schema.createTable('users', function(table) {
      table.integer('id').default(0);
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("id" integer DEFAULT 0)', []
    ));
  });

  it('generates columns using foreign keys', function() {
    var query = db.schema.createTable('users', function(table) {
      table.integer('profile_id').references('profiles.id');
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("profile_id" integer REFERENCES "profiles" ("id"))', []
    ));
  });

  it('generates columns using foreign key on self', function() {
    var query = db.schema.createTable('users', function(table) {
      table.integer('boss_id').references('id');
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("boss_id" integer REFERENCES "id")', []
    ));
  });

  it('gives error when foreign key is invalid', function() {
    expect(function() {
      db.schema.createTable('users', function(table) {
        table.integer('foreign_id').references('bad.foreign.key');
      })
      .statement;
    }).to.throw(/invalid.*"bad\.foreign\.key"/i);
  });

  it('generates columns using foreign keys that specify delete actions');

  it('can combine options', function() {
    var query = db.schema.createTable('users', function(table) {
      table.integer('profile_id').references('profiles.id').notNull().unique();
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("profile_id" integer NOT NULL UNIQUE ' +
        'REFERENCES "profiles" ("id"))', []
    ));
  });
});
