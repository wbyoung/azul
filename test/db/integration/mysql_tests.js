'use strict';

// $ mysql -u root
// > CREATE DATABASE azul_test;
// > exit

if (!/^(1|true)$/i.test(process.env.TEST_MYSQL || '1')) { return; }

var expect = require('chai').expect;
var path = require('path');
var Database = require('../../../lib/db/database');
var BluebirdPromise = require('bluebird');

var db, connection = {
  adapter: 'mysql',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'azul_test'
};

describe('MySQL', function() {
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
      expect(result1).to.eql({ rows: [], fields: [] });
      expect(result2).to.eql({
        rows: [{ id: 1 }], fields: ['id'] });
      expect(result3).to.eql({
        rows: [{ id: 1, name: 'Azul' }],
        fields: ['id', 'name'] });
      expect(result4).to.eql({ rows: [], fields: [] });
    })
    .done(done, done);
  });

  it('receives rows from raw sql', function(done) {
    var query = 'SELECT CAST(? AS SIGNED) AS number';
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

    // TODO: same todo as in the pg_tests.
    it('inserts data');
    it('selects data');
    it('updates data');
    it('drops tables');
  });
});
