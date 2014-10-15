'use strict';

// $ createuser root
// $ psql -U root -d postgres
// > CREATE DATABASE agave_test;
// > \q

if (!/^(1|true)$/i.test(process.env.TEST_POSTGRES || '1')) { return; }

var expect = require('chai').expect;
var path = require('path');
var Database = require('../../../lib/db/database');
var BluebirdPromise = require('bluebird');

var connection = {
  adapter: 'pg',
  username: 'root',
  password: '',
  database: 'agave_test'
};

describe('PostgresQL', function() {
  // TODO: should not connect to db until there's something to do (query)
  it.skip('connects to the database', function(done) {
    var db = Database.create(connection);
    db.ready().then(function(db2) {
      expect(db).to.eql(db2);
      expect(db._adapter._client).to.exist;
      return db.disconnect();
    })
    .done(done, done);
  });

  it('executes raw sql', function(done) {
    var db = Database.create(connection);
    var queries = [
      'create table agave_raw_sql_test (id serial, name varchar(255))',
      'insert into agave_raw_sql_test (name) values (\'Agave\') returning id',
      'select * from agave_raw_sql_test',
      'drop table agave_raw_sql_test'
    ];
    BluebirdPromise.reduce(queries, function(array, query) {
      return db._adapter.execute(query).then(function(result) {
        return array.concat([result]);
      });
    }, [])
    .spread(function(result1, result2, result3, result4) {
      expect(result1).to.eql({ command: 'CREATE', rows: [], fields: [] });
      expect(result2).to.eql({ command: 'INSERT',
        rows: [{ id: 1 }], fields: ['id'] });
      expect(result3).to.eql({ command: 'SELECT',
        rows: [{ id: 1, name: 'Agave' }],
        fields: ['id', 'name'] });
      expect(result4).to.eql({ command: 'DROP', rows: [], fields: [] });
    })
    .done(done, done);
  });

  it('receives rows from raw sql', function(done) {
    var db = Database.create(connection);
    var query = 'SELECT $1::int AS number';
    var args = ['1'];
    db._adapter.execute(query, args)
    .then(function(result) {
      expect(result.rows).to.eql([{ number: 1 }]);
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

    // TODO: consider how to implement these tests. the intention here is
    // to create more of an integration style test. perhaps it should be
    // shared amongst all of the adapter test files somehow.
    // it('inserts data');
    // it('selects data');
    // it('updates data');
    // it('drops tables');
  });

});
