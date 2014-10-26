'use strict';

// $ createuser root
// $ psql -U root -d postgres
// > CREATE DATABASE azul_test;
// > \q

if (!/^(1|true)$/i.test(process.env.TEST_POSTGRES || '1')) { return; }

var expect = require('chai').expect;
var path = require('path');
var Database = require('../../../lib/db/database');
var BluebirdPromise = require('bluebird');

var db, connection = {
  adapter: 'pg',
  username: process.env.PG_USER || 'root', // TODO: change to user
  password: process.env.PG_PASSWORD || '',
  database: process.env.PG_DATABASE || 'azul_test'
};

describe('PostgresQL', function() {
  before(function() { db = Database.create(connection); });
  after(function(done) { db.disconnect().then(done, done); });

  it('executes raw sql', function(done) {
    var queries = [
      'CREATE TABLE azul_raw_sql_test (id serial, name varchar(255))',
      'INSERT INTO azul_raw_sql_test (name) VALUES (\'Azul\') RETURNING id',
      'SELECT * FROM azul_raw_sql_test',
      'DROP TABLE azul_raw_sql_test'
    ];
    BluebirdPromise.reduce(queries, function(array, query) {
      return db._adapter.execute(query, []).then(function(result) {
        return array.concat([result]);
      });
    }, [])
    .spread(function(result1, result2, result3, result4) {
      expect(result1).to.eql({ command: 'CREATE', rows: [], fields: [] });
      expect(result2).to.eql({ command: 'INSERT',
        rows: [{ id: 1 }], fields: ['id'] });
      expect(result3).to.eql({ command: 'SELECT',
        rows: [{ id: 1, name: 'Azul' }],
        fields: ['id', 'name'] });
      expect(result4).to.eql({ command: 'DROP', rows: [], fields: [] });
    })
    .done(done, done);
  });

  it('receives rows from raw sql', function(done) {
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
      var migration =
        path.join(__dirname, '../../fixtures/migrations/blog');
      this.migrator = db.migrator(migration);
      this.migrator.migrate().then(function() { done(); }, done);
    });

    after(function(done) {
      this.migrator.rollback().then(function() { done(); }, done);
    });

    // TODO: consider how to implement these tests. the intention here is
    // to create more of an integration style test. perhaps it should be
    // shared amongst all of the adapter test files somehow.
    it('inserts data');
    it('selects data');
    it('updates data');
    it('drops tables');
  });

});
