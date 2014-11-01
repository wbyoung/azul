'use strict';

if (!/^(1|true)$/i.test(process.env.TEST_SQLITE || '1')) { return; }

var _ = require('lodash');
var expect = require('chai').expect;
var Database = require('../../../lib/db/database');
var BluebirdPromise = require('bluebird');

var shared = require('./shared_behaviors');
var returning = require('../../../lib/db/adapters/mixins/returning');
var PseudoReturn = returning.PseudoReturn;

var db, connection = {
  adapter: 'sqlite3',
  filename: ''
};

var resetSequence = BluebirdPromise.method(function(/*table*/) {
  // no need to reset
});

var cast = function(type, value) {
  switch (type) {
    // TODO: document better here & publicly
    // dates are stored as integers in sqlite3, so we need to cast to
    // timestamps when checking expected values.
    case 'date':
    case 'dateTime': value = value.getTime(); break;
    case 'bool': value = Number(value); break;
    // TODO: document better here & publicly (blob basically just a string in sqlite3)
    case 'binary': value = value; break;
  }
  return value;
};

describe('SQLite3', function() {
  before(function() { db = this.db = Database.create(connection); });
  before(function() { this.resetSequence = resetSequence; });
  before(function() { this.expectationTypeCast = cast; });
  after(function(done) { db.disconnect().then(done, done); });

  it('executes raw sql', function(done) {
    var returnId = PseudoReturn.create('id');
    var queries = [
      ['CREATE TABLE azul_raw_sql_test ' +
       '(id integer primary key autoincrement, name varchar(255))'],
      ['INSERT INTO azul_raw_sql_test (name) VALUES (\'Azul\')', [returnId]],
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
    var query = 'SELECT CAST(? AS INTEGER) AS number';
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
      expect(e.message).to.match(/SQLITE_ERROR.*syntax/i);
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
