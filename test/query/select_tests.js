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

  it('can be filtered when columns are specified', function() {
    expect(db.select('users', ['id']).where({ id: 1 }).sql()).to.eql(Statement.create(
      'SELECT "id" FROM "users" WHERE "id" = ?', [1]
    ));
  });

  it('can be ordered', function() {
    var query = db.select('users').order('signup');
    expect(query.sql()).to.eql(Statement.create(
      'SELECT * FROM "users" ORDER BY "signup" ASC', []
    ));
  });

  it('can be ordered via orderBy', function() {
    var query = db.select('users').orderBy('signup');
    expect(query.sql()).to.eql(Statement.create(
      'SELECT * FROM "users" ORDER BY "signup" ASC', []
    ));
  });

  it('can be ordered descending', function() {
    var query = db.select('users').order('-signup');
    expect(query.sql()).to.eql(Statement.create(
      'SELECT * FROM "users" ORDER BY "signup" DESC', []
    ));
  });

  it('can be ordered over multiple fields', function() {
    var query = db.select('users').order('-signup', 'username');
    expect(query.sql()).to.eql(Statement.create(
      'SELECT * FROM "users" ORDER BY "signup" DESC, "username" ASC', []
    ));
  });

  it('can be ordered and filtered', function() {
    var query = db.select('users')
      .where({ id: 1 })
      .order('-signup', 'username');
    expect(query.sql()).to.eql(Statement.create(
      'SELECT * FROM "users" WHERE "id" = ? ' +
      'ORDER BY "signup" DESC, "username" ASC', [1]
    ));
  });

  it('can be limited', function() {
    expect(db.select('users').limit(5).sql()).to.eql(Statement.create(
      'SELECT * FROM "users" LIMIT 5', []
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
    it('defaults to an inner join', function() {
      expect(db.select('articles').join('authors').sql()).to.eql(Statement.create(
        'SELECT * FROM "articles" INNER JOIN "authors" ON TRUE', []
      ));
    });

    it('accepts type', function() {
      expect(db.select('articles').join('authors', 'inner').sql()).to.eql(Statement.create(
        'SELECT * FROM "articles" INNER JOIN "authors" ON TRUE', []
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

    it('works with where clause', function() {
      var result = db.select('articles')
        .join('authors')
        .where({ name: 'Whitney' })
        .sql();
      expect(result.sql).to.match(/JOIN "authors" ON TRUE WHERE "name" = \?$/);
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
