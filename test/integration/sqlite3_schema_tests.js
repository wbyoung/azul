'use strict';

if (!/^(1|true)$/i.test(process.env.TEST_SQLITE || '1')) { return; }

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var Database = require('../../lib/database');
var EntryQuery = require('../../lib/query/entry');

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

  describe('creating a table', function() {
    beforeEach(function(done) {
      this.create = db.schema.createTable('people', function(table) {
        table.serial('id').pk().notNull();
        table.string('first_name');
        table.integer('best_friend_id').references('id').default(1);
        table.index('best_friend_id');
      });
      this.create.execute().return().then(done, done);
    });

    afterEach(function(done) {
      db.schema.dropTable('people')
        .execute()
        .return()
        .then(done, done);
    });

    it('was created with the right sql', function() {
      expect(this.create.sql).to.eql('-- procedure for ' +
        'CREATE TABLE "people" (' +
          '"id" integer PRIMARY KEY NOT NULL, ' +
          '"first_name" varchar(255), ' +
          '"best_friend_id" integer DEFAULT 1 REFERENCES "people" ("id"), ' +
          'INDEX "people_best_friend_id_idx" ("best_friend_id"))');

      var c = executedSQL()[0][0];
      expect(executedSQL()).to.eql([
        [c, 'SAVEPOINT AZULJS_1', []],
        [c, 'CREATE TABLE "people" (' +
          '"id" integer PRIMARY KEY NOT NULL, ' +
          '"first_name" varchar(255), ' +
          '"best_friend_id" integer DEFAULT 1 ' +
          'REFERENCES "people" ("id"))', []],
        [c, 'CREATE INDEX "people_best_friend_id_idx" ' +
          'ON "people" ("best_friend_id")', []],
        [c, 'RELEASE AZULJS_1', []],
      ]);
    });

    describe('after creation', function() {
      beforeEach(function() {
        db._adapter._execute.restore();
        sinon.spy(db._adapter, '_execute');
      });

      it('can add columns', function(done) {
        var alter = db.schema.alterTable('people', function(table) {
          table.string('last_name');
        });

        expect(alter.sql).to.not.match(/^--/);

        alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'ALTER TABLE "people" ADD COLUMN "last_name" varchar(255)', []]
          ]);
        })
        .then(done, done);
      });

      it('can add an index', function(done) {
        var alter = db.schema.alterTable('people', function(table) {
          table.index(['first_name', 'best_friend_id']);
        });

        expect(alter.sql).to.eql('CREATE INDEX ' +
          '"people_first_name_best_friend_id_idx" ON "people" ' +
          '("first_name", "best_friend_id")');

        alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'CREATE INDEX ' +
            '"people_first_name_best_friend_id_idx" ON "people" ' +
            '("first_name", "best_friend_id")', []]
          ]);
        })
        .then(done, done);
      });

      it('can drop an index', function(done) {
        var alter = db.schema.alterTable('people', function(table) {
          table.dropIndex('best_friend_id');
        });

        expect(alter.sql).to
          .eql('DROP INDEX "people_best_friend_id_idx"');

        alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'DROP INDEX "people_best_friend_id_idx"', []]
          ]);
        })
        .then(done, done);
      });

      it('can rename an index', function(done) {
        var alter = db.schema.alterTable('people', function(table) {
          table.renameIndex('people_best_friend_id_idx', 'bff_idx');
        });

        expect(alter.sql).to
          .eql('-- procedure for ALTER INDEX "people_best_friend_id_idx" ' +
            'RENAME TO "bff_idx"');

        alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'SAVEPOINT AZULJS_1', []],
            [c, 'PRAGMA index_info("people_best_friend_id_idx")', []],
            [c, 'DROP INDEX "people_best_friend_id_idx"', []],
            [c, 'CREATE INDEX "bff_idx" ' +
              'ON "people" ("best_friend_id")', []],
            [c, 'RELEASE AZULJS_1', []],
          ]);
        })
        .then(done, done);
      });

      it('can rename columns', function(done) {
        var alter = db.schema.alterTable('people', function(table) {
          table.rename('first_name', 'first', 'string');
        });

        expect(alter.sql).to.eql('-- procedure for ' +
          'ALTER TABLE "people" RENAME "first_name" TO "first"');

        alter
        .then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'SAVEPOINT AZULJS_1', []],
            [c, 'PRAGMA defer_foreign_keys=1', []],
            [c, 'PRAGMA table_info("people")', []],
            [c, 'PRAGMA index_list("people")', []],
            [c, 'PRAGMA index_info("people_best_friend_id_idx")', []],
            [c, 'PRAGMA foreign_key_list("people")', []],
            [c, 'ALTER TABLE "people" RENAME TO "people_old"', []],
            [c, 'CREATE TABLE "people" (' +
              '"id" integer PRIMARY KEY NOT NULL, ' +
              '"first" varchar(255), ' +
              '"best_friend_id" integer DEFAULT 1, ' +
              'FOREIGN KEY ("best_friend_id") REFERENCES "people" ("id") ' +
              'ON DELETE NO ACTION ON UPDATE NO ACTION MATCH NONE)', []],
            [c, 'INSERT INTO "people" ("id", "first", "best_friend_id") ' +
              'SELECT "id", "first_name", "best_friend_id" FROM "people_old"', []],
            [c, 'DROP TABLE "people_old"', []],
            [c, 'CREATE INDEX "people_best_friend_id_idx" ' +
              'ON "people" ("best_friend_id")', []],
            [c, 'RELEASE AZULJS_1', []],
          ]);
        })
        .then(done, done);
      });

      it('drops a column once when procedure is repeated', function(done) {
        var alter = db.schema.alterTable('people', function(table) {
          table.drop('first_name');
        });

        expect(alter.sql).to
          .eql('-- procedure for ALTER TABLE "people" DROP COLUMN "first_name"');

        alter
        .then(function() { return alter; })
        .then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'SAVEPOINT AZULJS_1', []],
            [c, 'PRAGMA defer_foreign_keys=1', []],
            [c, 'PRAGMA table_info("people")', []],
            [c, 'PRAGMA index_list("people")', []],
            [c, 'PRAGMA index_info("people_best_friend_id_idx")', []],
            [c, 'PRAGMA foreign_key_list("people")', []],
            [c, 'ALTER TABLE "people" RENAME TO "people_old"', []],
            [c, 'CREATE TABLE "people" (' +
              '"id" integer PRIMARY KEY NOT NULL, ' +
              '"best_friend_id" integer DEFAULT 1, ' +
              'FOREIGN KEY ("best_friend_id") REFERENCES "people" ("id") ' +
              'ON DELETE NO ACTION ON UPDATE NO ACTION MATCH NONE)', []],
            [c, 'INSERT INTO "people" ("id", "best_friend_id") ' +
              'SELECT "id", "best_friend_id" FROM "people_old"', []],
            [c, 'DROP TABLE "people_old"', []],
            [c, 'CREATE INDEX "people_best_friend_id_idx" ' +
              'ON "people" ("best_friend_id")', []],
            [c, 'RELEASE AZULJS_1', []],
          ]);
        })
        .then(done, done);
      });

      describe('with raw table rename queries causing problems', function() {
        beforeEach(function() {
          var raw = EntryQuery.__class__.prototype.raw;
          sinon.stub(EntryQuery.__class__.prototype, 'raw', function(query) {
            if (query.match(/RENAME TO/)) {
              arguments[0] = query.replace(/"$/, '_wrongname"');
            }
            return raw.apply(this, arguments);
          });
        });

        afterEach(function() {
          EntryQuery.__class__.prototype.raw.restore();
        });

        it('rolls back alter table', function(done) {
          db.schema.alterTable('people', function(table) {
            table.drop('first_name');
          })
          .execute()
          .throw(new Error('Expected alter to fail'))
          .catch(function(e) {
            expect(e).to.match(/no.*table.*people_old/i);
            var c = executedSQL()[0][0];
            expect(executedSQL()).to.eql([
              [c, 'SAVEPOINT AZULJS_1', []],
              [c, 'PRAGMA defer_foreign_keys=1', []],
              [c, 'PRAGMA table_info("people")', []],
              [c, 'PRAGMA index_list("people")', []],
              [c, 'PRAGMA index_info("people_best_friend_id_idx")', []],
              [c, 'PRAGMA foreign_key_list("people")', []],
              [c, 'ALTER TABLE "people" RENAME TO "people_old_wrongname"', []],
              [c, 'CREATE TABLE "people" (' +
                '"id" integer PRIMARY KEY NOT NULL, ' +
                '"best_friend_id" integer DEFAULT 1, ' +
                'FOREIGN KEY ("best_friend_id") REFERENCES "people" ("id") ' +
                'ON DELETE NO ACTION ON UPDATE NO ACTION MATCH NONE)', []],
              [c, 'INSERT INTO "people" ("id", "best_friend_id") ' +
                'SELECT "id", "best_friend_id" FROM "people_old"', []],
              [c, 'ROLLBACK TO AZULJS_1', []],
            ]);
          })
          .then(done, done);
        });
      });

      it('can add, drop, and index simultaneously', function(done) {
        var alter = db.schema.alterTable('people', function(table) {
          table.drop('first_name');
          table.string('name');
          table.index('name');
          table.renameIndex('people_best_friend_id_idx', 'bff_idx');
        });

        expect(alter.sql).to.eql('-- procedure for ALTER TABLE "people" ' +
          'DROP COLUMN "first_name", ADD COLUMN "name" varchar(255), ' +
          'ADD INDEX "people_name_idx" ("name"), ' +
          'RENAME INDEX "people_best_friend_id_idx" TO "bff_idx"');

        alter.then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'SAVEPOINT AZULJS_1', []],
            [c, 'PRAGMA defer_foreign_keys=1', []],
            [c, 'PRAGMA table_info("people")', []],
            [c, 'PRAGMA index_list("people")', []],
            [c, 'PRAGMA index_info("people_best_friend_id_idx")', []],
            [c, 'PRAGMA foreign_key_list("people")', []],
            [c, 'ALTER TABLE "people" RENAME TO "people_old"', []],
            [c, 'CREATE TABLE "people" (' +
              '"id" integer PRIMARY KEY NOT NULL, ' +
              '"best_friend_id" integer DEFAULT 1, ' +
              '"name" varchar(255), ' +
              'FOREIGN KEY ("best_friend_id") REFERENCES "people" ("id") ' +
              'ON DELETE NO ACTION ON UPDATE NO ACTION MATCH NONE)', []],
            [c, 'INSERT INTO "people" ("id", "best_friend_id") ' +
              'SELECT "id", "best_friend_id" FROM "people_old"', []],
            [c, 'DROP TABLE "people_old"', []],
            [c, 'CREATE INDEX "bff_idx" ' +
              'ON "people" ("best_friend_id")', []],
            [c, 'CREATE INDEX "people_name_idx" ON "people" ("name")', []],
            [c, 'RELEASE AZULJS_1', []],
          ]);
        })
        .then(done, done);
      });
    });
  });
});
