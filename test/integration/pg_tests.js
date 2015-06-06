'use strict';

require('../helpers');

// $ createuser -s root
// $ psql -U root -d postgres
// > CREATE DATABASE azul_test;
// > \q

if (!/^(1|true)$/i.test(process.env.TEST_POSTGRES || '1')) { return; }

var _ = require('lodash');
var Database = require('../../lib/database');
var shared = require('./shared_behaviors');

var db, connection = {
  adapter: 'pg',
  connection: {
    user: process.env.PG_USER || 'root',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_DATABASE || 'azul_test'
  }
};

var resetSequence = function(table) {
  return db.query.raw('ALTER SEQUENCE ' + table + '_id_seq restart');
};

var castDatabaseValue = function(type, value) {
  switch(type) {
    case 'integer64': // these numeric types are read from the db as strings
    case 'decimal': value = +value; break;
  }
  return value;
};

describe('PostgreSQL', function() {
  before(function() { db = this.db = Database.create(connection); });
  before(function() { this.resetSequence = resetSequence; });
  before(function() { this.castDatabaseValue = castDatabaseValue; });
  after(function() { return db.disconnect(); });

  // run all shared examples
  _.each(shared(), function(fn, name) {
    if (fn.length !== 0) {
      throw new Error('Cannot execute shared example: ' + name);
    }
    fn();
  });
});
