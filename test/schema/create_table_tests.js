'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var CreateTable = require('../../lib/schema/table/create');
var FakeAdapter = require('../fakes/adapter');
var Statement = require('../../lib/types/statement');

var db, adapter;

describe('CreateTable', function() {
  before(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
  });

  it('cannot be created directly', function() {
    expect(function() {
      CreateTable.create();
    }).to.throw(/CreateTable must be spawned/i);
  });

  it('must provide a callback', function() {
    expect(function() {
      db.schema.createTable('users').sql;
    }).to.throw(/missing callback/i);
  });

  it('generates primary key columns via `pk`', function() {
    var query = db.schema.createTable('users', function(table) {
      table.integer('identifier').pk();
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("identifier" integer PRIMARY KEY)', []
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
      }).sql;
    }).to.throw(/only.*one primary key/);
  });

  it('does not allow more than one primary key w/ explicit table `pk`', function() {
    expect(function() {
      db.schema.createTable('users').pk('id').with(function(table) {
        table.integer('id2').pk();
      }).sql;
    }).to.throw(/only.*one primary key/);
  });

  it('generates not null columns', function() {
    var query = db.schema.createTable('users', function(table) {
      table.integer('id').notNull(); // pk will be automatically added
      table.string('username').notNull();
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("id" integer PRIMARY KEY NOT NULL, ' +
      '"username" varchar(255) NOT NULL)', []
    ));
  });

  it('automatically adds a primary key', function() {
    var query = db.schema.createTable('users', function(table) {
      table.string('username');
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("id" serial PRIMARY KEY, ' +
        '"username" varchar(255))', []
    ));
  });

  it('can add a named primary key', function() {
    var query = db.schema.createTable('users').pk('uid').with(function(table) {
      table.string('username');
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("uid" serial PRIMARY KEY, ' +
        '"username" varchar(255))', []
    ));
  });

  it('can skip adding a primary key', function() {
    var query = db.schema.createTable('users')
    .primaryKey(null).with(function(table) {
      table.string('username');
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("username" varchar(255))', []
    ));
  });

  it('generates indexed columns', function() {
    var query = db.schema.createTable('users')
    .primaryKey(null).with(function(table) {
      table.string('username');
      table.index('username');
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("username" varchar(255), ' +
      'INDEX "users_username_idx" ("username"))', []
    ));
  });

  it('generates unique columns', function() {
    var query = db.schema.createTable('users', function(table) {
      table.integer('id').unique();
      table.integer('age').unique();
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("id" integer PRIMARY KEY UNIQUE, ' +
      '"age" integer UNIQUE)', []
    ));
  });

  it('generates columns with defaults', function() {
    var query = db.schema.createTable('users', function(table) {
      table.integer('id').default(0);
      table.string('name').default('anonymous');
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("id" integer PRIMARY KEY DEFAULT 0, ' +
      '"name" varchar(255) DEFAULT \'anonymous\')', []
    ));
  });

  it('generates columns with default of string', function() {
    var query = db.schema.createTable('users').pk(null).with(function(table) {
      table.integer('name').default('Anonymous');
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("name" integer DEFAULT \'Anonymous\')', []
    ));
  });

  it('generates columns using foreign keys', function() {
    var query = db.schema.createTable('users').pk(null).with(function(table) {
      table.integer('profile_id').references('profiles.id');
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("profile_id" integer REFERENCES "profiles" ("id"))', []
    ));
  });

  it('generates columns using foreign key on self', function() {
    var query = db.schema.createTable('users').pk(null).with(function(table) {
      table.integer('boss_id').references('id');
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("boss_id" integer REFERENCES "users" ("id"))', []
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

  it('generates columns using foreign keys that specify delete actions', function() {
    var query = db.schema.createTable('users').pk(null).with(function(table) {
      table.integer('profile_id').references('profiles.id').onDelete('cascade');
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("profile_id" integer ' +
      'REFERENCES "profiles" ("id") ON DELETE CASCADE)', []
    ));
  });

  it('generates columns using foreign keys that specify update actions', function() {
    var query = db.schema.createTable('users').pk(null).with(function(table) {
      table.integer('profile_id').references('profiles.id').onUpdate('nullify');
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("profile_id" integer ' +
      'REFERENCES "profiles" ("id") ON UPDATE SET NULL)', []
    ));
  });

  it('generates columns using foreign keys that specify both actions', function() {
    var query = db.schema.createTable('users').pk(null).with(function(table) {
      table.integer('profile_id')
        .references('profiles.id')
        .onDelete('restrict')
        .onUpdate('cascade');
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("profile_id" integer ' +
      'REFERENCES "profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)', []
    ));
  });

  it('give an error for unsupported foreign key delete actions', function() {
    expect(function() {
      db.schema.createTable('users').pk(null).with(function(table) {
        table.integer('profile_id').references('profiles.id').onDelete('bogus');
      }).sql;
    }).throw(/unknown.*foreign key.*action.*bogus/i);
  });

  it('give an error for unsupported foreign key update actions', function() {
    expect(function() {
      db.schema.createTable('users').pk(null).with(function(table) {
        table.integer('profile_id').references('profiles.id').onUpdate('bogus');
      }).sql;
    }).throw(/unknown.*foreign key.*action.*bogus/i);
  });

  it('can combine options', function() {
    var query = db.schema.createTable('users').pk(null).with(function(table) {
      table.integer('profile_id').references('profiles.id').notNull().unique();
    });
    expect(query.statement).to.eql(Statement.create(
      'CREATE TABLE "users" ("profile_id" integer NOT NULL UNIQUE ' +
        'REFERENCES "profiles" ("id"))', []
    ));
  });
});
