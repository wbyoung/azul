'use strict';

// $ createuser root
// $ psql -U root -d postgres
// > CREATE DATABASE agave_test;
// > \q

if (!/^(1|true)$/i.test(process.env.TEST_POSTGRES || '1')) { return; }

var expect = require('chai').expect;
var path = require('path');
var Database = require('../../../lib/db/database');

var connection = {
  adapter: 'pg',
  username: 'root',
  password: '',
  database: 'agave_test'
};

describe('PostgresQL', function() {
  // TODO: should not connect to db until there's something to do (query)
  it('connects to the database', function(done) {
    var db = Database.create(connection);
    db.ready().then(function(db2) {
      expect(db).to.eql(db2);
      expect(db._adapter._client).to.exist;
      return db.disconnect();
    })
    .done(done, done);
  });

  describe('with migrations applied', function() {
    before(function(done) {
      var db = this.db = Database.create(connection);
      var migration = this.migration =
        path.join(__dirname, '../../fixtures/migrations/blog');
      db.schema.migrate(migration).then(function() { done(); }, done);
    });

    after(function(done) {
      var db = this.db;
      var migration = this.migration;
      db.schema.rollback(migration).then(function() { done(); }, done);
    });

    // it('inserts data');
    // it('selects data');
    // it('updates data');
    // it('drops tables');
  });

});
