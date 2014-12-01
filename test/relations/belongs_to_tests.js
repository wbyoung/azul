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
    var hasMany = Model.hasMany;
    var belongsTo = Model.belongsTo;
    var attr = Model.attr;

    Article = db.Model.extend({
      title: attr(),
      author: belongsTo(User)
    });
    User = db.Model.extend({
      username: attr(),
      articles: hasMany(Article, { inverse: 'author' })
    });

    // name the classes as late as possible to ensure we're not locking in
    // anything based on the class name. all information should be computed
    // from property names or delayed until the time of access to the db.
    Article.reopenClass({ __name__: 'Article' });
    User.reopenClass({ __name__: 'User' });
  });

  beforeEach(function() {
    article = Article.fresh({ id: 1 });
  });

  beforeEach(function() {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'username'],
      rows: [{ id: 1, username: 'wbyoung' }]
    });
    adapter.intercept(/select.*from "articles"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: 'Journal', 'author_id': 1 }]
    });
  });

  it.skip('has related methods', function() {
    expect(Article.__class__.prototype).to.have.ownProperty('author');
    expect(article).to.respondTo('fetchAuthor');
    expect(article).to.respondTo('setAuthor');
    expect(article).to.respondTo('storeAuthor');
  });

  describe('pre-fetch', function() {
    it.skip('executes multiple queries', function(done) {
      Article.objects.with('author').fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "articles"', []],
          ['SELECT * FROM "users" WHERE "id" = ?', [1]]
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
      adapter.intercept(/select.*from "articles".*order by "id"/i, {
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
      adapter.intercept(/select.*from "users"/i, { // TODO: add where id in?
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

  describe('helpers', function() {
    it.skip('allows create', function() {
      var user = article.createAuthor({ username: 'jill' });
      expect(user.articleId).to.eql(article.id);
      expect(article.author).to.equal(user);
      expect(user).to.to.be.an.instanceOf(User.__class__);
    });

    it.skip('allows store with existing object', function(done) {
      var user = User.fresh({ username: 'jack' });
      var promise = article.storeAuthor(user);

      // these are set after the promise is executed
      expect(user.articleId).to.not.exist;
      expect(user.article).to.not.exist; // TODO: add to the inverse set?

      promise.then(function() {
        expect(article.authorId).to.eql(user.id);
        expect(article.author).to.equal(user);
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_id" = ? ' +
           'WHERE "id" = ?', [1, 5]]
        ]);
      })
      .done(done, done);
    });

    it('allows store with unsaved object');
  });
});
