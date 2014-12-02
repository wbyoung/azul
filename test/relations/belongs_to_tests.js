'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var FakeAdapter = require('../fakes/adapter');

require('../helpers/model');

var db,
  adapter,
  Article,
  User,
  article;

describe('Model.belongsTo', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });

    var Model = db.Model;
    var belongsTo = Model.belongsTo;
    var attr = Model.attr;

    Article = db.model('article').reopen({
      title: attr(),
      author: belongsTo('user')
    });
    User = db.model('user').reopen({
      username: attr()
    });
  });

  beforeEach(function() {
    article = Article.fresh({ id: 932, title: 'Azul News', authorId: 623 });
  });

  beforeEach(function() {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'username'],
      rows: [{ id: 623, username: 'wbyoung' }]
    });
    adapter.intercept(/select.*from "articles"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 448, title: 'Journal', 'author_id': 623 }]
    });
    adapter.intercept(/insert into "users"/i, {
      fields: ['id'],
      rows: [{ id: 838 }]
    });
  });

  it('has related methods', function() {
    expect(Article.__class__.prototype).to.have.ownProperty('author');
    expect(Article.__class__.prototype).to.have.ownProperty('authorId');
    expect(article).to.respondTo('fetchAuthor');
    expect(article).to.respondTo('setAuthor');
  });

  describe('pre-fetch', function() {
    it('executes multiple queries', function(done) {
      Article.objects.with('author').fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "articles"', []],
          ['SELECT * FROM "users" WHERE "id" = ?', [623]]
        ]);
      })
      .done(done, done);
    });

    it.skip('caches related objects', function(done) {
      Article.objects.with('author').fetch().get('0').then(function(foundArticle) {
        expect(foundArticle.id).to.eql(1);
        expect(foundArticle.authorId).to.eql(1);
        expect(foundArticle.author).to.eql([
          User.fresh({ id: 1, username: 'wbyoung' })
        ]);
      })
      .done(done, done);
    });

    it.skip('works with multiple articles each authored by multiple users', function(done) {
      var articlesRegex = /select.*from "articles".*order by "id"/i;
      var usersRegex =
        /select.*from "users" where "author_id" in \(\?, \?, \?\)/i;
      adapter.intercept(articlesRegex, {
        fields: ['id', 'title', 'author_id'],
        rows: [
          { id: 3, title: 'Announcing Azul', 'author_id': 1 },
          { id: 5, title: 'Node.js ORM', 'author_id': 1 },
          { id: 9, title: 'Delicious Pancakes', 'author_id': 2 },
          { id: 8, title: 'Awesome Margaritas', 'author_id': 2 },
          { id: 4, title: 'Tasty Kale Salad', 'author_id': 2 },
          { id: 6, title: 'The Bipartisan System', 'author_id': 4 },
        ]
      });
      adapter.intercept(usersRegex, {
        fields: ['id', 'username'],
        rows: [
          { id: 1, username: 'wbyoung' },
          { id: 2, username: 'kate' },
          { id: 4, username: 'sam' },
        ]
      });

      Article.objects.with('author').orderBy('id').fetch().then(function(articles) {
        expect(_(articles).map('title').value()).to.eql([
          'Announcing Azul', 'Tasty Kale Salad', 'Node.js ORM',
          'The Bipartisan System', 'Awesome Margaritas', 'Delicious Pancakes'
        ]);
        expect(_(articles).map('author').map('username').value()).to.eql([
          'wbyoung', 'kate', 'wbyoung', 'sam', 'kate', 'kate'
        ]);
      })
      .done(done, done);
    });
  });

  describe('relation', function() {

    it('fetches related object', function(done) {
      article.fetchAuthor().then(function(user) {
        expect(user.attrs).to.eql({ id: 623, username: 'wbyoung' });
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "users" WHERE "id" = ?', [623]]
        ]);
      })
      .done(done, done);
    });

    it('throws when attempting to access un-loaded item', function() {
      expect(function() {
        article.author;
      }).to.throw(/author.*not yet.*loaded/i);
    });

    it('allows access loaded item', function(done) {
      article.fetchAuthor().then(function() {
        expect(article.author.attrs).to.eql({ id: 623, username: 'wbyoung' });
      })
      .done(done, done);
    });
  });

  describe('helpers', function() {
    it('allows create', function() {
      var user = article.createAuthor({ username: 'jill' });
      expect(article.author).to.equal(user);
      expect(user).to.to.be.an.instanceOf(User.__class__);
    });

    it('allows store with existing object', function(done) {
      article.author = User.fresh({ id: 3, username: 'jack' });
      article.save().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "title" = ?, "author_id" = ? ' +
           'WHERE "id" = ?', ['Azul News', 3, 932]]
        ]);
      })
      .done(done, done);
    });

    it('allows store with unsaved object', function(done) {
      var user = User.create({ username: 'jack' });
      article.author = user;
      article.save().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['INSERT INTO "users" ("username") VALUES (?) ' +
           'RETURNING "id"', ['jack']],
          ['UPDATE "articles" SET "title" = ?, "author_id" = ? ' +
           'WHERE "id" = ?', ['Azul News', 838, 932]]
        ]);
      })
      .done(done, done);
    });
  });
});
