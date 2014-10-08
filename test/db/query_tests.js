'use strict';

var expect = require('chai').expect;

var Database = require('../../lib/db');
var MockAdapter = require('../mocks/adapter');
var Statement = require('../../lib/db/grammar/statement');
var Condition = require('../../lib/db/condition'),
  f = Condition.f;

var db;

describe('query', function() {
  before(function() {
    db = Database.create({ adapter: MockAdapter });
  });

  describe('select', function() {

    it('accesses a table', function() {
      expect(db.select('users').sql()).to.eql(Statement.create(
        'select * from users', []
      ));
    });

    it('can be filtered', function() {
      expect(db.select('users').where({ id: 1 }).sql()).to.eql(Statement.create(
        'select * from users where "id" = ?', [1]
      ));
    });

    it('can be filtered 2 times', function() {
      var result = db.select('users')
        .where({ id: 1 })
        .where({ name: 'Whitney' }).sql();
      expect(result).to.eql(Statement.create(
        'select * from users where ("id" = ?) and "name" = ?', [1, 'Whitney']
      ));
    });

    it('can be filtered 3 times', function() {
      var result = db.select('users')
        .where({ id: 1 })
        .where({ name: 'Whitney' })
        .where({ city: 'Portland' }).sql();
      expect(result).to.eql(Statement.create(
        'select * from users where (("id" = ?) and "name" = ?) and "city" = ?', [1, 'Whitney', 'Portland']
      ));
    });

    it('handles predicates', function() {
      expect(db.select('articles').where({ 'words[gt]': 200 }).sql()).to.eql(Statement.create(
        'select * from articles where "words" > ?', [200]
      ));
    });

    describe('column specification', function() {
      it('accepts simple names', function() {
        expect(db.select('articles', ['title', 'body']).sql()).to.eql(Statement.create(
          'select "title", "body" from articles', []
        ));
      });

      it('accepts simple table qualified names', function() {
        expect(db.select('articles', ['articles.title', 'body']).sql()).to.eql(Statement.create(
          'select "articles"."title", "body" from articles', []
        ));
      });
    });

    describe('joins', function() {
      it('defaults to a cross join', function() {
        expect(db.select('articles').join('authors').sql()).to.eql(Statement.create(
          'select * from articles cross join authors', []
        ));
      });

      it('accepts type', function() {
        expect(db.select('articles').join('authors', 'inner').sql()).to.eql(Statement.create(
          'select * from articles inner join authors', []
        ));
      });

      it('accepts conditions', function() {
        var result = db.select('articles').join('authors', { 'articles.author_id': f('authors.id') }).sql();
        expect(result.sql).to.match(/join authors on "articles"."author_id" = "authors"."id"$/);
      });

      it('accepts conditions as a simple string', function() {
        var result = db.select('articles').join('authors', 'articles.author_id=authors.id').sql();
        expect(result.sql).to.match(/join authors on "articles"."author_id" = "authors"."id"$/);
      });
    });

    // TODO: aggregation
    //   Avg
    //   Count
    //   Max
    //   Min
    //   StdDev
    //   Sum
    //   Variance


    it('is immutable', function() {
      var original = db.select('users');
      var filtered = original.where({ id: 2 });
      expect(original.sql()).to.not.eql(filtered.sql());
    });
  });
});
