'use strict';

if (!/^(1|true)$/i.test(process.env.TEST_SQLITE || '1')) { return; }

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var Database = require('../../lib/database');

var db, executedSQL, connection = {
  adapter: 'mysql',
  connection: {
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'azul_test'
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
      return db.schema.createTable('people', function(table) {
        table.serial('id').pk().notNull();
        table.string('first_name');
        table.integer('best_friend_id').references('id');
      })
      .execute()
      .return()
      .then(done, done);
    });

    afterEach(function(done) {
      return db.schema.dropTable('people')
        .execute()
        .return()
        .then(done, done);
    });

    it('was created with the right sql', function() {
      var c = executedSQL()[0][0];
      expect(executedSQL()).to.eql([
        [c, 'CREATE TABLE `people` (`id` integer AUTO_INCREMENT PRIMARY KEY NOT NULL, ' +
          '`first_name` varchar(255), `best_friend_id` integer, ' +
          'FOREIGN KEY (`best_friend_id`) REFERENCES `people` (`id`))', []],
      ]);
    });

    describe('after creation', function() {
      beforeEach(function() {
        db._adapter._execute.restore();
        sinon.spy(db._adapter, '_execute');
      });

      it('can add columns with foreign keys', function(done) {
        db.schema.alterTable('people', function(table) {
          table.integer('worst_enemy_id').references('id');
        })
        .then(function() {
          var c = executedSQL()[0][0];
          expect(executedSQL()).to.eql([
            [c, 'ALTER TABLE `people` ADD COLUMN `worst_enemy_id` integer, ' +
              'ADD FOREIGN KEY (`worst_enemy_id`) REFERENCES `people` (`id`)', []],
          ]);
        })
        .then(done, done);
      });
    });

  });

});
