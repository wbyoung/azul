'use strict';

require('../helpers');

// $ mysql -u root
// > CREATE DATABASE azul_test;
// > exit

if (!/^(1|true)$/i.test(process.env.TEST_MYSQL || '1')) { return; }

var _ = require('lodash');
var Database = require('../../lib/database');
var shared = require('./shared_behaviors');

var db, connection = {
  adapter: 'mysql',
  connection: {
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'azul_test',
  },
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
  after(function() { return db.disconnect(); });

  // run all shared examples
  _.each(shared(), function(fn, name) {
    if (fn.length !== 0) {
      throw new Error('Cannot execute shared example: ' + name);
    }
    fn();
  });
});
