'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var AlterTableQuery = require('../../lib/schema/table/alter');
var FakeAdapter = require('../fakes/adapter');
var Statement = require('../../lib/grammar/statement');

var db, adapter;

describe('AlterTableQuery', function() {
  before(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
  });

  it('cannot be created directly', function() {
    expect(function() {
      AlterTableQuery.create();
    }).to.throw(/AlterTableQuery must be spawned/i);
  });

  it('must provide a callback', function() {
    expect(function() {
      db.schema.alterTable('users');
    }).to.throw(/missing callback/i);
  });

  it('generates primary key columns via `pk`', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('id').pk();
    });
    expect(query.sql()).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "id" integer PRIMARY KEY', []
    ));
  });

  it('can add multiple columns', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('id').pk();
      table.integer('age');
    });
    expect(query.sql()).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "id" integer PRIMARY KEY, ' +
      'ADD COLUMN "age" integer', []
    ));
  });

  it('generates primary key columns via `primarykey`', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('id').primaryKey();
    });
    expect(query.sql()).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "id" integer PRIMARY KEY', []
    ));
  });

  it('does not allow more than one primary key', function() {
    expect(function() {
      db.schema.alterTable('users', function(table) {
        table.integer('id').pk();
        table.integer('id2').pk();
      });
    }).to.throw(/only.*one primary key/);
  });

  it('generates not null columns', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('id').notNull();
    });
    expect(query.sql()).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "id" integer NOT NULL', []
    ));
  });

  it('generates unique columns', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('id').unique();
    });
    expect(query.sql()).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "id" integer UNIQUE', []
    ));
  });

  it('generates columns with defaults', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('id').default(0);
    });
    expect(query.sql()).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "id" integer DEFAULT 0', []
    ));
  });

  it('generates columns using foreign keys', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('profile_id').references('profiles.id');
    });
    expect(query.sql()).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "profile_id" integer REFERENCES "profiles" ("id")', []
    ));
  });

  it('generates columns using foreign key on self', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('boss_id').references('id');
    });
    expect(query.sql()).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "boss_id" integer REFERENCES "id"', []
    ));
  });

  it('gives error when foreign key is invalid', function() {
    expect(function() {
      db.schema.alterTable('users', function(table) {
        table.integer('foreign_id').references('bad.foreign.key');
      })
      .sql();
    }).to.throw(/invalid.*"bad\.foreign\.key"/i);
  });

  it('can drop columns', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.drop('name');
    });
    expect(query.sql()).to.eql(Statement.create(
      'ALTER TABLE "users" DROP COLUMN "name"', []
    ));
  });

  it('can be cloned', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.drop('id');
    }).clone();
    expect(query.sql()).to.eql(Statement.create(
      'ALTER TABLE "users" DROP COLUMN "id"', []
    ));
  });

  it('can combine options', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('profile_id').references('profiles.id').notNull().unique();
      table.drop('age');
    });

    expect(query.sql()).to.eql(Statement.create(
      'ALTER TABLE "users" ' +
        'DROP COLUMN "age", ' +
        'ADD COLUMN "profile_id" integer NOT NULL UNIQUE ' +
        'REFERENCES "profiles" ("id")', []
    ));
  });
});
