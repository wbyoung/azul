'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../../lib/db');
var SelectQuery = require('../../../lib/db/query/select');
var MockAdapter = require('../../mocks/adapter');
var Statement = require('../../../lib/db/grammar/statement');
var Condition = require('../../../lib/db/condition'),
  f = Condition.f;

var db;

describe('SelectQuery', function() {
  before(function() {
    db = Database.create({ adapter: MockAdapter.create({}) });
  });

  it('cannot be created directly', function() {
    expect(function() {
      SelectQuery.create();
    }).to.throw(/SelectQuery must be spawned/i);
  });

  it('accesses a table', function() {
    expect(db.select('users').sql()).to.eql(Statement.create(
      'SELECT * FROM "users"', []
    ));
  });

  it('can be filtered', function() {
    expect(db.select('users').where({ id: 1 }).sql()).to.eql(Statement.create(
      'SELECT * FROM "users" WHERE "id" = ?', [1]
    ));
  });

  it('can be filtered 2 times', function() {
    var result = db.select('users')
      .where({ id: 1 })
      .where({ name: 'Whitney' }).sql();
    expect(result).to.eql(Statement.create(
      'SELECT * FROM "users" WHERE ("id" = ?) AND "name" = ?', [1, 'Whitney']
    ));
  });

  it('can be filtered 3 times', function() {
    var result = db.select('users')
      .where({ id: 1 })
      .where({ name: 'Whitney' })
      .where({ city: 'Portland' }).sql();
    expect(result).to.eql(Statement.create(
      'SELECT * FROM "users" WHERE (("id" = ?) AND "name" = ?) AND "city" = ?', [1, 'Whitney', 'Portland']
    ));
  });

  it('handles predicates', function() {
    expect(db.select('articles').where({ 'words[gt]': 200 }).sql()).to.eql(Statement.create(
      'SELECT * FROM "articles" WHERE "words" > ?', [200]
    ));
  });

  describe('column specification', function() {
    it('accepts simple names', function() {
      expect(db.select('articles', ['title', 'body']).sql()).to.eql(Statement.create(
        'SELECT "title", "body" FROM "articles"', []
      ));
    });

    it('accepts simple table qualified names', function() {
      expect(db.select('articles', ['articles.title', 'body']).sql()).to.eql(Statement.create(
        'SELECT "articles"."title", "body" FROM "articles"', []
      ));
    });
  });

  describe('joins', function() {
    it('defaults to a cross join', function() {
      expect(db.select('articles').join('authors').sql()).to.eql(Statement.create(
        'SELECT * FROM "articles" CROSS JOIN "authors"', []
      ));
    });

    it('accepts type', function() {
      expect(db.select('articles').join('authors', 'inner').sql()).to.eql(Statement.create(
        'SELECT * FROM "articles" INNER JOIN "authors"', []
      ));
    });

    it('accepts conditions', function() {
      var result = db.select('articles').join('authors', { 'articles.author_id': f('authors.id') }).sql();
      expect(result.sql).to.match(/JOIN "authors" ON "articles"."author_id" = "authors"."id"$/);
    });

    it('accepts conditions as a simple string', function() {
      var result = db.select('articles').join('authors', 'articles.author_id=authors.id').sql();
      expect(result.sql).to.match(/JOIN "authors" ON "articles"."author_id" = "authors"."id"$/);
    });
  });

  describe('aggregation', function() {
    it('will eventually have aggregation support');
    // avg, count, max, min, stdDev, sum, variance
  });

  it('is immutable', function() {
    var original = db.select('users');
    var filtered = original.where({ id: 2 });
    expect(original.sql()).to.not.eql(filtered.sql());
  });
});
