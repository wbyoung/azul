'use strict';

var expect = require('chai').expect;

var DB = require('../lib/db');
var PGAdapter = require('../lib/db/adapters/pg');

var standardStatements = function(db) {

  describe('select', function() {

    it('accesses a table', function() {
      expect(db.select('users').sql()).to.eql('select * from users');
    });

    it('can be filtered', function() {
      expect(db.select('users').where({ id: 1 }).sql()).to.eql('select * from users where id = 1');
    });

    it.skip('can be re-filtered', function() {
      expect(db.select('users').where({ id: 1 }).where({ name: 'Whitney' }).sql()).to.eql('select * from users where id = 1 and name = "Whitney"');
    });

    it('is immutable', function() {
      var original = db.select('users');
      var filtered = original.where({ id: 2 });
      expect(original.sql()).to.not.eql(filtered.sql());
    });

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
