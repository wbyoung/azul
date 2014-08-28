'use strict';

var expect = require('chai').expect;

var DB = require('../lib/db');
var Adapter = require('../lib/db/adapters/base');

var Condition = require('../lib/db/condition'),
  f = Condition.FieldString;

describe('query', function() {
  var adapter = new Adapter();
  var db = new DB(adapter);

  describe('select', function() {

    it('accesses a table', function() {
      expect(db.select('users').sql()).to.eql({
        sql: 'select * from users',
        arguments: []
      });
    });

    it('can be filtered', function() {
      expect(db.select('users').where({ id: 1 }).sql()).to.eql({
        sql: 'select * from users where "id" = ?',
        arguments: [1]
      });
    });

    it('can be filtered 2 times', function() {
      var result = db.select('users')
        .where({ id: 1 })
        .where({ name: 'Whitney' }).sql();
      expect(result).to.eql({
        sql: 'select * from users where ("id" = ?) and "name" = ?',
        arguments: [1, "Whitney"]
      });
    });

    it('can be filtered 3 times', function() {
      var result = db.select('users')
        .where({ id: 1 })
        .where({ name: 'Whitney' })
        .where({ city: 'Portland' }).sql();
      expect(result).to.eql({
        sql: 'select * from users where (("id" = ?) and "name" = ?) and "city" = ?',
        arguments: [1, "Whitney", "Portland"]
      });
    });

    it('handles predicates', function() {
      expect(db.select('articles').where({ 'words[gt]': 200 }).sql()).to.eql({
        sql: 'select * from articles where "words" > ?',
        arguments: [200]
      });
    });

    describe('column specification', function() {
      it('accepts simple names', function() {
        expect(db.select('articles', ['title', 'body']).sql()).to.eql({
          sql: 'select "title", "body" from articles',
          arguments: []
        });
      });

      it('accepts simple table qualified names', function() {
        expect(db.select('articles', ['articles.title', 'body']).sql()).to.eql({
          sql: 'select "articles"."title", "body" from articles',
          arguments: []
        });
      });
    });

    describe('joins', function() {
      it('defaults to a cross join', function() {
        expect(db.select('articles').join('authors').sql()).to.eql({
          sql: 'select * from articles cross join authors',
          arguments: []
        });
      });

      it('accepts type', function() {
        expect(db.select('articles').join('authors', 'inner').sql()).to.eql({
          sql: 'select * from articles inner join authors',
          arguments: []
        });
      });

      it('accepts conditions', function() {
        // TODO: would be good to make the right hand side of any object here automatically a
        // field-safe string rather than having it need to be explicit?
        var result = db.select('articles').join('authors', { 'articles.author_id': f('authors.id') }).sql();
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
