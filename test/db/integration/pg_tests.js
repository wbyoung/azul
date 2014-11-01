'use strict';

// $ createuser -s root
// $ psql -U root -d postgres
// > CREATE DATABASE azul_test;
// > \q

if (!/^(1|true)$/i.test(process.env.TEST_POSTGRES || '1')) { return; }

var _ = require('lodash');
var expect = require('chai').expect;
var Database = require('../../../lib/db/database');
var BluebirdPromise = require('bluebird');
var shared = require('./shared_behaviors');

var db, connection = {
  adapter: 'pg',
  user: process.env.PG_USER || 'root',
  password: process.env.PG_PASSWORD || '',
  database: process.env.PG_DATABASE || 'azul_test'
};

var resetSequence = function(table) {
  return db.query.raw('ALTER SEQUENCE ' + table + '_id_seq restart');
};

var castDatabaseValue = function(type, value) {
  switch(type) {
    // TODO: document better here & publicly
    case 'integer64':
    case 'decimal': value = +value; break;
    // TODO: document better here & publicly
    case 'binary': value = new Buffer(value); break;
  }
  return value;
};

describe('PostgresQL', function() {
  before(function() { db = this.db = Database.create(connection); });
  before(function() { this.resetSequence = resetSequence; });
  before(function() { this.castDatabaseValue = castDatabaseValue; });
  after(function(done) { db.disconnect().then(done, done); });

  it('executes raw sql', function(done) {
    var queries = [
      ['CREATE TABLE azul_raw_sql_test (id serial, name varchar(255))'],
      ['INSERT INTO azul_raw_sql_test (name) VALUES (\'Azul\') RETURNING id'],
      ['SELECT * FROM azul_raw_sql_test'],
      ['DROP TABLE azul_raw_sql_test']
    ];
    BluebirdPromise.reduce(queries, function(array, info) {
      var query = info[0], args = info[1] || [];
      return db._adapter.execute(query, args).then(function(result) {
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
    var query = 'SELECT $1::int AS number';
    var args = ['1'];
    db._adapter.execute(query, args)
    .then(function(result) {
      expect(result.rows).to.eql([{ number: 1 }]);
    })
    .done(done, done);
  });

  it('reports errors', function(done) {
    var query = 'SELECT & FROM ^';
    var args = [];
    db._adapter.execute(query, args)
    .throw(new Error('Expected query to fail.'))
    .catch(function(e) {
      expect(e.message).to.match(/syntax error/i);
    })
    .done(done, done);
  });

  // run all shared examples
  _.each(shared, function(fn, name) {
    if (fn.length !== 0) {
      throw new Error('Cannot execute shared example: ' + name);
    }
    fn();
  });
});
