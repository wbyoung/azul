'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var AlterTable = require('../../lib/schema/table/alter');
var FakeAdapter = require('../fakes/adapter');
var Statement = require('../../lib/types/statement');

var db, adapter;

describe('AlterTable', function() {
  before(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
  });

  it('cannot be created directly', function() {
    expect(function() {
      AlterTable.create();
    }).to.throw(/AlterTable must be spawned/i);
  });

  it('must provide a callback', function() {
    expect(function() {
      db.schema.alterTable('users').sql;
    }).to.throw(/missing callback/i);
  });

  it('generates primary key columns via `pk`', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('id').pk();
    });
    expect(query.statement).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "id" integer PRIMARY KEY', []
    ));
  });

  it('can add multiple columns', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('id').pk();
      table.integer('age');
    });
    expect(query.statement).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "id" integer PRIMARY KEY, ' +
      'ADD COLUMN "age" integer', []
    ));
  });

  it('generates primary key columns via `primarykey`', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('id').primaryKey();
    });
    expect(query.statement).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "id" integer PRIMARY KEY', []
    ));
  });

  it('does not allow more than one primary key', function() {
    expect(function() {
      db.schema.alterTable('users', function(table) {
        table.integer('id').pk();
        table.integer('id2').pk();
      }).sql;
    }).to.throw(/only.*one primary key/);
  });

  it('generates not null columns', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('id').notNull();
    });
    expect(query.statement).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "id" integer NOT NULL', []
    ));
  });

  it('generates unique columns', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('id').unique();
    });
    expect(query.statement).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "id" integer UNIQUE', []
    ));
  });

  it('generates columns with defaults', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('id').default(0);
    });
    expect(query.statement).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "id" integer DEFAULT 0', []
    ));
  });

  it('generates columns using foreign keys', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('profile_id').references('profiles.id');
    });
    expect(query.statement).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "profile_id" integer REFERENCES "profiles" ("id")', []
    ));
  });

  it('generates columns using foreign key on self', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('boss_id').references('id');
    });
    expect(query.statement).to.eql(Statement.create(
      'ALTER TABLE "users" ADD COLUMN "boss_id" integer REFERENCES "users" ("id")', []
    ));
  });

  it('gives error when foreign key is invalid', function() {
    expect(function() {
      db.schema.alterTable('users', function(table) {
        table.integer('foreign_id').references('bad.foreign.key');
      })
      .statement;
    }).to.throw(/invalid.*"bad\.foreign\.key"/i);
  });

  it('can drop columns', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.drop('name');
    });
    expect(query.statement).to.eql(Statement.create(
      'ALTER TABLE "users" DROP COLUMN "name"', []
    ));
  });

  it('can add indexes', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.index('name');
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE INDEX "users_name_idx" ON "users" ("name")', []
    ));
  });

  it('can drop indexes', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.dropIndex('name');
    });
    expect(query.statement).to.eql(Statement.create(
      'DROP INDEX "users_name_idx"', []
    ));
  });

  it('can drop indexes by name', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.dropIndex({ name: 'myindex' });
    });
    expect(query.statement).to.eql(Statement.create(
      'DROP INDEX "myindex"', []
    ));
  });

  it('can rename indexes', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.renameIndex('a', 'b');
    });
    expect(query.statement).to.eql(Statement.create(
      'ALTER INDEX "a" RENAME TO "b"', []
    ));
  });


  it('can be cloned', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.drop('id');
    }).clone();
    expect(query.statement).to.eql(Statement.create(
      'ALTER TABLE "users" DROP COLUMN "id"', []
    ));
  });

  it('can combine options', function() {
    var query = db.schema.alterTable('users', function(table) {
      table.integer('profile_id')
        .references('profiles.id')
        .onDelete('cascade')
        .notNull()
        .unique();
      table.drop('age');
    });

    expect(query.statement).to.eql(Statement.create(
      'ALTER TABLE "users" ' +
        'DROP COLUMN "age", ' +
        'ADD COLUMN "profile_id" integer NOT NULL UNIQUE ' +
        'REFERENCES "profiles" ("id") ON DELETE CASCADE', []
    ));
  });
});
