'use strict';

// $ createuser -s root
// $ psql -U root -d postgres
// > CREATE DATABASE azul_test;
// > \q

if (!/^(1|true)$/i.test(process.env.TEST_POSTGRES || '1')) { return; }

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var Database = require('../../lib/database');
var EntryQuery = require('../../lib/query/entry');

var db, executedSQL, connection = {
  adapter: 'pg',
  connection: {
    user: process.env.PG_USER || 'root',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_DATABASE || 'azul_test'
  }
};

describe('PostgreSQL schema', function() {
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
      db.schema.createTable('people', function(table) {
        table.serial('id').pk().notNull();
        table.string('first_name');
        table.integer('best_friend_id').references('id').default(1);
      })
      .then(function() {
        db._adapter._execute.restore();
        sinon.spy(db._adapter, '_execute');
      })
      .return()
      .then(done, done);
    });

    afterEach(function(done) {
      db.schema.dropTable('people')
        .execute()
        .return()
        .then(done, done);
    });

    it('can rename columns', function(done) {
      var alter = db.schema.alterTable('people', function(table) {
        table.rename('first_name', 'first', 'string');
      });

      expect(alter.sql).to
        .eql('ALTER TABLE "people" RENAME "first_name" TO "first"');

      alter.then(function() {
        var c = executedSQL()[0][0];
        expect(executedSQL()).to.eql([
          [c, 'ALTER TABLE "people" RENAME "first_name" TO "first"', []]
        ]);
      })
      .then(done, done);
    });

    it('can rename two columns', function(done) {
      var alter = db.schema.alterTable('people', function(table) {
        table.rename('id', 'identifier', 'integer');
        table.rename('first_name', 'first', 'string');
      });

      expect(alter.sql).to.eql('-- procedure for ' +
        'ALTER TABLE "people" RENAME "id" TO "identifier", ' +
        'RENAME "first_name" TO "first"');

      alter.then(function() {
        var c = executedSQL()[0][0];
        expect(executedSQL()).to.eql([
          [c, 'BEGIN', []],
          [c, 'ALTER TABLE "people" RENAME "id" TO "identifier"', []],
          [c, 'ALTER TABLE "people" RENAME "first_name" TO "first"', []],
          [c, 'COMMIT', []],
        ]);
      })
      .then(done, done);
    });

    it('can add & rename columns', function(done) {
      var alter = db.schema.alterTable('people', function(table) {
        table.string('last');
        table.rename('first_name', 'first', 'string');
      });

      expect(alter.sql).to.eql('-- procedure for ' +
        'ALTER TABLE "people" ADD COLUMN "last" varchar(255), ' +
        'RENAME "first_name" TO "first"');

      alter.then(function() {
        var c = executedSQL()[0][0];
        expect(executedSQL()).to.eql([
          [c, 'BEGIN', []],
          [c, 'ALTER TABLE "people" ADD COLUMN "last" varchar(255)', []],
          [c, 'ALTER TABLE "people" RENAME "first_name" TO "first"', []],
          [c, 'COMMIT', []],
        ]);
      })
      .then(done, done);
    });

    describe('with raw column rename queries causing problems', function() {
      beforeEach(function() {
        var raw = EntryQuery.__class__.prototype.raw;
        sinon.stub(EntryQuery.__class__.prototype, 'raw', function(query) {
          var regex = /(RENAME "[^"]+)(" TO)/i;
          if (query.match(regex)) {
            arguments[0] = query.replace(regex, '$1_invalid$2');
          }
          return raw.apply(this, arguments);
        });
      });

      afterEach(function() {
        EntryQuery.__class__.prototype.raw.restore();
      });

      it('rolls back alter column', function(done) {
        db.schema.alterTable('people', function(table) {
          table.string('last');
          table.rename('first_name', 'first', 'string');
        })
        .execute()
        .throw(new Error('Expected alter to fail'))
        .catch(function(e) {
          expect(e).to.match(/first_name_invalid.*not.*exist/i);
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'BEGIN', []],
            [c, 'ALTER TABLE "people" ADD COLUMN "last" varchar(255)', []],
            [c, 'ALTER TABLE "people" RENAME "first_name_invalid" TO "first"', []],
            [c, 'ROLLBACK', []],
          ]);
        })
        .then(done, done);
      });
    });

  });
});
