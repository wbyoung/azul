'use strict';

var expect = require('chai').expect;

var DB = require('../lib/db');
var PGAdapter = require('../lib/db/adapters/pg');

var standardStatements = function(db) {

  describe('select', function() {

    it('creates simple statements', function() {
      expect(db.select('users').sql()).to.eql('select * from users');
    });

    it('can be filtered', function() {
      expect(db.select('users').where({ id: 1 }).sql()).to.eql('select * from users where id = 1');
    });

    it('is immutable');

  });
};

describe('postgres', function() {
  var adapter = new PGAdapter();
  var db = new DB(adapter);

  before(function() {
    this.adapter = adapter;
    this.db = db;
  });

  standardStatements(db);
});
