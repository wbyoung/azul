'use strict';

// $ mysql -u root
// > CREATE DATABASE azul_test;
// > exit

if (!/^(1|true)$/i.test(process.env.TEST_MYSQL || '1')) { return; }

var _ = require('lodash');
var expect = require('chai').expect;
var Database = require('../../lib/database');
var Promise = require('bluebird');

var shared = require('./shared_behaviors');
var returning = require('../../lib/adapters/mixins/returning');
var PseudoReturn = returning.PseudoReturn;

var db, connection = {
  adapter: 'mysql',
  connection: {
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'azul_test'
  }
};

var resetSequence = function(table) {
  return db.query.raw('ALTER TABLE ' + table + ' AUTO_INCREMENT = 1;');
};

var castDatabaseValue = function(type, value) {
  switch(type) {
    case 'bool': value = Boolean(value); break; // bool is stored as number
  }
  return value;
};

describe('MySQL', function() {
  before(function() { db = this.db = Database.create(connection); });
  before(function() { this.resetSequence = resetSequence; });
  before(function() { this.castDatabaseValue = castDatabaseValue; });
  after(function(done) { db.disconnect().then(done, done); });

  it('executes raw sql', function(done) {
    var returnId = PseudoReturn.create('id');
    var queries = [
      ['CREATE TABLE azul_raw_sql_test (id serial, name varchar(255))'],
      ['INSERT INTO azul_raw_sql_test (name) VALUES (\'Azul\')', [returnId]],
      ['SELECT * FROM azul_raw_sql_test'],
      ['DROP TABLE azul_raw_sql_test']
    ];
    Promise.reduce(queries, function(array, info) {
      var query = info[0], args = info[1] || [];
      return db._adapter.execute(query, args).then(function(result) {
        return array.concat([result]);
      });
    }, [])
    .map(_.partial(_.omit, _, 'client'))
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

  it('reports errors', function(done) {
    var query = 'SELECT & FROM ^';
    var args = [];
    db._adapter.execute(query, args)
    .throw(new Error('Expected query to fail.'))
    .catch(function(e) {
      expect(e.message).to.match(/PARSE_ERROR.*syntax.*MySQL/i);
    })
    .done(done, done);
  });

  it('provides defaults for decimal', function() {
    expect(db._adapter.translator.typeForDecimal())
      .to.eql('numeric(64, 30)');
  });

  describe('with simple table', function() {
    before(function(done) {
      db._adapter
        .execute('CREATE TABLE azul_test (id serial, name varchar(255))', [])
        .then(_.ary(done, 0), done);
    });

    after(function(done) {
      db._adapter
        .execute('DROP TABLE azul_test', [])
        .then(_.ary(done, 0), done);
    });

    it('returning does not work on non primary key', function(done) {
      db.insert('azul_test', { name: 'Azul' })
      .returning('name')
      .then(function(data) {
        expect(data.rows[0].name).to.not.eql('Azul');
      })
      .then(done, done);
    });
  });

  // run all shared examples
  _.each(shared(), function(fn, name) {
    if (fn.length !== 0) {
      throw new Error('Cannot execute shared example: ' + name);
    }
    fn();
  });
});
