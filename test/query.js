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

    it('can be re-filtered', function() {
      var result = db.select('users')
        .where({ id: 1 })
        .where({ name: 'Whitney' }).sql();
      expect(result).to.eql('select * from users where ' +
        '(id = 1) and name = "Whitney"');
    });

    it('can be re-filtered multiple times', function() {
      var result = db.select('users')
        .where({ id: 1 })
        .where({ name: 'Whitney' })
        .where({ city: 'Portland' }).sql();
      expect(result).to.eql('select * from users where ' +
        '((id = 1) and name = "Whitney") and city = "Portland"');
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
