'use strict';

if (!/^(1|true)$/i.test(process.env.TEST_SQLITE || '1')) { return; }

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var Database = require('../../lib/database');

var db, executedSQL, connection = {
  adapter: 'sqlite3',
  connection: {
    filename: ''
  }
};

describe('SQLite3 schema', function() {
  before(function(done) {
    db = Database.create(connection);
    db.query.raw('select 1').execute().return().then(done, done);
  });
  after(function(done) { db.disconnect().then(done, done); });

  beforeEach(function() {
    sinon.spy(db._adapter, '_execute');
    executedSQL = function() {
      var result = [];
      db._adapter._execute.getCalls().forEach(function(call) {
        result.push(call.args.slice(0,3));
      });
      return result;
    };
  });

  afterEach(function() {
    db._adapter._execute.restore();
  });

  describe('with a table', function() {
    beforeEach(function(done) {
      return db.schema.createTable('people', function(table) {
        table.serial('id').pk().notNull();
        table.string('first_name');
        table.integer('best_friend_id').references('id');
      })
      .then(function() {
        db._adapter._execute.restore();
        sinon.spy(db._adapter, '_execute');
      })
      .return()
      .then(done, done);
    });

    afterEach(function(done) {
      return db.schema.dropTable('people')
        .execute()
        .return()
        .then(done, done);
    });

    it('can add columns', function(done) {
      db.schema.alterTable('people', function(table) {
        table.string('last_name');
      })
      .then(function() {
        var c = executedSQL()[0][0];
        expect(executedSQL()).to.eql([
          [c, 'ALTER TABLE "people" ADD COLUMN "last_name" varchar(255)', []]
        ]);
      })
      .then(done, done);
    });

    it('can drop columns', function(done) {
      var alter = db.schema.alterTable('people', function(table) {
        table.drop('first_name');
      });

      expect(alter.sql).to
        .eql('-- procedure for ALTER TABLE "people" DROP COLUMN "first_name"');

      alter.then(function() {
        var c = executedSQL()[0][0];
        expect(executedSQL()).to.eql([
          [c, 'SAVEPOINT AZULJS_1', []],
          [c, 'PRAGMA defer_foreign_keys=1', []],
          [c, 'PRAGMA table_info("people")', []],
          [c, 'PRAGMA foreign_key_list("people")', []],
          [c, 'ALTER TABLE "people" RENAME TO "people_old"', []],
          [c, 'CREATE TABLE "people" (' +
            '"id" integer PRIMARY KEY NOT NULL, "best_friend_id" integer, ' +
            'FOREIGN KEY ("best_friend_id") REFERENCES "people" ("id") ' +
            'ON DELETE NO ACTION ON UPDATE NO ACTION MATCH NONE)', []],
          [c, 'INSERT INTO "people" ("id", "best_friend_id") ' +
            'SELECT "id", "best_friend_id" FROM "people_old"', []],
          [c, 'DROP TABLE "people_old"', []],
          [c, 'RELEASE AZULJS_1', []],
        ]);
      })
      .then(done, done);
    });

    it('can add and drop columns', function(done) {
      var alter = db.schema.alterTable('people', function(table) {
        table.drop('first_name');
        table.string('name');
      });

      expect(alter.sql).to.eql('-- procedure for ALTER TABLE "people" ' +
        'DROP COLUMN "first_name", ADD COLUMN "name" varchar(255)');

      alter.then(function() {
        var c = executedSQL()[0][0];
        expect(executedSQL()).to.eql([
          [c, 'SAVEPOINT AZULJS_1', []],
          [c, 'PRAGMA defer_foreign_keys=1', []],
          [c, 'PRAGMA table_info("people")', []],
          [c, 'PRAGMA foreign_key_list("people")', []],
          [c, 'ALTER TABLE "people" RENAME TO "people_old"', []],
          [c, 'CREATE TABLE "people" (' +
            '"id" integer PRIMARY KEY NOT NULL, "best_friend_id" integer, ' +
            '"name" varchar(255), ' +
            'FOREIGN KEY ("best_friend_id") REFERENCES "people" ("id") ' +
            'ON DELETE NO ACTION ON UPDATE NO ACTION MATCH NONE)', []],
          [c, 'INSERT INTO "people" ("id", "best_friend_id") ' +
            'SELECT "id", "best_friend_id" FROM "people_old"', []],
          [c, 'DROP TABLE "people_old"', []],
          [c, 'RELEASE AZULJS_1', []],
        ]);
      })
      .then(done, done);
    });
  });

});
