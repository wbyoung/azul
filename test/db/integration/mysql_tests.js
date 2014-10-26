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
      'INSERT INTO azul_raw_sql_test (name) VALUES (\'Azul\')',
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

  // TODO: add more tests modeled from the PG tests
});
