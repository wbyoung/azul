'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));

var Database = require('../../lib/database');
var SelectQuery = require('../../lib/query/select');
var FakeAdapter = require('../fakes/adapter');
var Statement = require('../../lib/grammar/statement');
var Condition = require('../../lib/condition'),
  f = Condition.f;

var db,
  adapter;

describe('SelectQuery', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
  });

  it('cannot be created directly', function() {
    expect(function() {
      SelectQuery.create();
    }).to.throw(/SelectQuery must be spawned/i);
  });

  it('accesses a table', function() {
    expect(db.select('users').statement).to.eql(Statement.create(
      'SELECT * FROM "users"', []
    ));
  });

  it('can use table name in a select all', function() {
    expect(db.select('users', ['users.*']).statement).to.eql(Statement.create(
      'SELECT "users".* FROM "users"', []
    ));
  });

  it('can be filtered', function() {
    expect(db.select('users').where({ id: 1 }).statement).to.eql(Statement.create(
      'SELECT * FROM "users" WHERE "id" = ?', [1]
    ));
  });

  it('can be filtered 2 times', function() {
    var result = db.select('users')
      .where({ id: 1 })
      .where({ name: 'Whitney' }).statement;
    expect(result).to.eql(Statement.create(
      'SELECT * FROM "users" WHERE ("id" = ?) AND "name" = ?', [1, 'Whitney']
    ));
  });

  it('can be filtered 3 times', function() {
    var result = db.select('users')
      .where({ id: 1 })
      .where({ name: 'Whitney' })
      .where({ city: 'Portland' }).statement;
    expect(result).to.eql(Statement.create(
      'SELECT * FROM "users" WHERE (("id" = ?) AND "name" = ?) AND "city" = ?', [1, 'Whitney', 'Portland']
    ));
  });

  it('can be filtered when columns are specified', function() {
    expect(db.select('users', ['id']).where({ id: 1 }).statement).to.eql(Statement.create(
      'SELECT "id" FROM "users" WHERE "id" = ?', [1]
    ));
  });

  it('can be ordered', function() {
    var query = db.select('users').order('signup');
    expect(query.statement).to.eql(Statement.create(
      'SELECT * FROM "users" ORDER BY "signup" ASC', []
    ));
  });

  it('can be ordered via orderBy', function() {
    var query = db.select('users').orderBy('signup');
    expect(query.statement).to.eql(Statement.create(
      'SELECT * FROM "users" ORDER BY "signup" ASC', []
    ));
  });

  it('can be ordered descending', function() {
    var query = db.select('users').order('-signup');
    expect(query.statement).to.eql(Statement.create(
      'SELECT * FROM "users" ORDER BY "signup" DESC', []
    ));
  });

  it('can be ordered over multiple fields', function() {
    var query = db.select('users').order('-signup', 'username');
    expect(query.statement).to.eql(Statement.create(
      'SELECT * FROM "users" ORDER BY "signup" DESC, "username" ASC', []
    ));
  });

  it('can be ordered and filtered', function() {
    var query = db.select('users')
      .where({ id: 1 })
      .order('-signup', 'username');
    expect(query.statement).to.eql(Statement.create(
      'SELECT * FROM "users" WHERE "id" = ? ' +
      'ORDER BY "signup" DESC, "username" ASC', [1]
    ));
  });

  it('can be limited', function() {
    expect(db.select('users').limit(5).statement).to.eql(Statement.create(
      'SELECT * FROM "users" LIMIT 5', []
    ));
  });

  it('handles predicates', function() {
    expect(db.select('articles').where({ 'words[gt]': 200 }).statement).to.eql(Statement.create(
      'SELECT * FROM "articles" WHERE "words" > ?', [200]
    ));
  });

  describe('column specification', function() {
    it('accepts simple names', function() {
      expect(db.select('articles', ['title', 'body']).statement).to.eql(Statement.create(
        'SELECT "title", "body" FROM "articles"', []
      ));
    });

    it('accepts simple table qualified names', function() {
      expect(db.select('articles', ['articles.title', 'body']).statement).to.eql(Statement.create(
        'SELECT "articles"."title", "body" FROM "articles"', []
      ));
    });
  });

  describe('joins', function() {
    it('defaults to an inner join', function() {
      expect(db.select('articles').join('authors').statement).to.eql(Statement.create(
        'SELECT * FROM "articles" INNER JOIN "authors" ON TRUE', []
      ));
    });

    it('accepts type', function() {
      expect(db.select('articles').join('authors', 'inner').statement).to.eql(Statement.create(
        'SELECT * FROM "articles" INNER JOIN "authors" ON TRUE', []
      ));
    });

    it('accepts conditions', function() {
      var result = db.select('articles').join('authors', { 'articles.author_id': f('authors.id') }).statement;
      expect(result.sql).to.match(/JOIN "authors" ON "articles"."author_id" = "authors"."id"$/);
    });

    it('accepts alternate name', function() {
      expect(db.select('articles').join({ authors: 'authors_alias' }).statement).to.eql(Statement.create(
        'SELECT * FROM "articles" INNER JOIN "authors" "authors_alias" ON TRUE', []
      ));
    });

    it('accepts conditions as a simple string', function() {
      var result = db.select('articles').join('authors', 'articles.author_id=authors.id').statement;
      expect(result.sql).to.match(/JOIN "authors" ON "articles"."author_id" = "authors"."id"$/);
    });

    it('works with where clause', function() {
      var result = db.select('articles')
        .join('authors')
        .where({ name: 'Whitney' })
        .statement;
      expect(result.sql).to.match(/JOIN "authors" ON TRUE WHERE "name" = \?$/);
    });

    it('supports grouping', function() {
      var result = db.select('articles')
        .join('authors')
        .groupBy('id')
        .statement;
      expect(result.sql).to.match(/JOIN "authors".*GROUP BY "id"$/);
    });
  });

  describe('aggregation', function() {
    it('will eventually have aggregation support');
    // avg, count, max, min, stdDev, sum, variance
  });

  it('is immutable', function() {
    var original = db.select('users');
    var filtered = original.where({ id: 2 });
    expect(original.statement).to.not.eql(filtered.statement);
  });

  it('has a fetch method', function(done) {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: '1' }]
    });
    db.select('users').fetch().then(function(rows) {
      expect(rows).to.eql([{ id: 1, title: '1' }]);
    })
    .then(done, done);
  });

  it('gives an error when using fetch with a non-array transform', function(done) {
    db.select('users').transform(function(result) { return result; }).fetch()
    .throw(new Error('Expected query to fail.'))
    .catch(function(e) {
      expect(e.message).to.match(/transform.*did not produce.*array/i);
    })
    .then(done, done);
  });

  it('has a fetchOne method', function(done) {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: '1' }]
    });
    db.select('users').fetchOne().then(function(result) {
      expect(result).to.eql({ id: 1, title: '1' });
    })
    .then(done, done);
  });

  it('gives an error when fetchOne gets no results', function(done) {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'title'],
      rows: []
    });
    db.select('users').fetchOne()
    .throw(new Error('Expected query to fail.'))
    .catch(function(e) {
      expect(e.message).to.match(/no results/i);
      expect(e.code).to.eql('NO_RESULTS_FOUND');
      expect(e.sql).to.eql('SELECT * FROM "users"');
      expect(e.args).to.eql([]);
    })
    .then(done, done);
  });

  it('gives an error when fetchOne gets multiple results', function(done) {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: '1' }, { id: 2, title: '2' }]
    });
    db.select('users').fetchOne()
    .throw(new Error('Expected query to fail.'))
    .catch(function(e) {
      expect(e.message).to.match(/multiple results/i);
      expect(e.code).to.eql('MULTIPLE_RESULTS_FOUND');
      expect(e.sql).to.eql('SELECT * FROM "users"');
      expect(e.args).to.eql([]);
    })
    .then(done, done);
  });

  describe('when adapter throws an error', function() {
    beforeEach(function() {
      adapter.intercept(/.*/, function() {
        throw new Error('This adapter fails every time');
      });
    });

    it('emits errors', function(done) {
      var spy = sinon.spy();

      db.select('users').on('error', spy).execute()
      .catch(function() {})
      .then(function() {
        expect(spy).to.have.been.calledOnce;
        expect(spy.getCall(0).args[0].message).to.match(/adapter fails/i);
      })
      .then(done, done);
    });

    it('rejects with the error', function(done) {
      db.select('users').execute()
      .throw(new Error('Expected query to fail.'))
      .catch(function(e) {
        expect(e.message).to.match(/adapter fails/i);
      })
      .then(done, done);
    });
  });
});
