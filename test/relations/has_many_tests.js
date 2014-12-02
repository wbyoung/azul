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
  user,
  articleObjects;

describe('Model.hasMany', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });

    var Model = db.Model;
    var hasMany = Model.hasMany;
    var attr = Model.attr;

    Article = db.model('article').reopen({
      title: attr(),
      authorId: attr('author_id') // fake belongTo
    });
    User = db.model('user').reopen({
      username: attr(),
      articles: hasMany(Article, { inverse: 'author' })
    });
  });

  beforeEach(function() {
    user = User.fresh({ id: 1 });
    articleObjects = user.articleObjects;
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

  it('has related methods', function() {
    expect(User.__class__.prototype).to.have.ownProperty('articles');
    expect(user).to.have.property('articleObjects');
    expect(user).to.respondTo('createArticle');
    expect(user).to.respondTo('createArticle');
    expect(user).to.respondTo('addArticle');
    expect(user).to.respondTo('addArticles');
    expect(user).to.respondTo('removeArticle');
    expect(user).to.respondTo('removeArticles');
    expect(user).to.respondTo('clearArticles');
  });

  describe('pre-fetch', function() {
    it('executes multiple queries', function(done) {
      User.objects.with('articles').fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "users"', []],
          ['SELECT * FROM "articles" WHERE "author_id" = ?', [1]]
        ]);
      })
      .done(done, done);
    });

    it('caches related objects', function(done) {
      User.objects.with('articles').fetch().get('0').then(function(foundUser) {
        expect(foundUser.id).to.eql(1);
        expect(foundUser.username).to.eql('wbyoung');
        expect(foundUser.articles).to.eql([
          Article.fresh({ id: 1, title: 'Journal', authorId: 1 })
        ]);
      })
      .done(done, done);
    });

    it('works with multiple models each having multiple related objects', function(done) {
      var usersRegex = /select.*from "users".*order by "id"/i;
      var articlesRegex =
        /select.*from "articles" where "author_id" in \(\?, \?, \?\)/i;
      adapter.intercept(usersRegex, {
        fields: ['id', 'username'],
        rows: [
          { id: 1, username: 'wbyoung' },
          { id: 2, username: 'kate' },
          { id: 4, username: 'sam' },
        ]
      });
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

      User.objects.with('articles').orderBy('id').fetch().then(function(users) {
        expect(users[0].username).to.eql('wbyoung');
        expect(users[1].username).to.eql('kate');
        expect(users[2].username).to.eql('sam');
        expect(_.map(users[0].articles, 'title')).to.eql([
          'Announcing Azul', 'Node.js ORM'
        ]);
        expect(_.map(users[1].articles, 'title')).to.eql([
          'Delicious Pancakes', 'Awesome Margaritas', 'Tasty Kale Salad'
        ]);
        expect(_.map(users[2].articles, 'title')).to.eql([
          'The Bipartisan System'
        ]);
      })
      .done(done, done);
    });
  });

  describe('relation', function() {

    it('fetches related objects', function(done) {
      articleObjects.fetch().then(function(articles) {
        expect(articles).to.eql([
          Article.fresh({ id: 1, title: 'Journal', authorId: 1 })
        ]);
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "articles" WHERE "author_id" = ?', [1]]
        ]);
      })
      .done(done, done);
    });

    it('caches the related objects query', function() {
      expect(user.articleObjects).to.equal(articleObjects);
    });

    it('throws when attempting to access un-loaded collection', function() {
      expect(function() {
        user.articles;
      }).to.throw(/articles.*not yet.*loaded/i);
    });

    it('does not consider relation loaded when fetched on a duplicated query', function(done) {
      articleObjects.clone().fetch().then(function() {
        return user.articles;
      })
      .throw(new Error('Expected access to relation to fail.'))
      .catch(function(e) {
        expect(e.message).to.match(/articles.*not yet.*loaded/i);
      })
      .done(done, done);
    });

    it('allows access loaded collection', function(done) {
      articleObjects.fetch().then(function() {
        expect(user.articles).to.eql([
          Article.fresh({ id: 1, title: 'Journal', authorId: 1 })
        ]);
      })
      .done(done, done);
    });

    it('can be filtered', function(done) {
      articleObjects.where({ title: 'Azul' }).fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "articles" WHERE ("author_id" = ?) AND ' +
           '"title" = ?', [1, 'Azul']]
        ]);
      })
      .done(done, done);
    });

    it('allows update', function(done) {
      articleObjects.update({ title: 'Azul' }).then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "title" = ? ' +
           'WHERE "author_id" = ?', ['Azul', 1]]
        ]);
      })
      .done(done, done);
    });

    it('allows delete', function(done) {
      articleObjects.delete().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['DELETE FROM "articles" WHERE "author_id" = ?', [1]]
        ]);
      })
      .done(done, done);
    });
  });

  describe('helpers', function() {
    it('allows create', function() {
      var article = user.createArticle({ title: 'Hello' });
      // TODO: remove this one line once inverse_tests are working
      expect(article.authorId).to.eql(user.id);
      expect(article.author).to.equal(user);
      expect(article).to.to.be.an.instanceOf(Article.__class__);
    });

    it('does not create collection cache during create', function() {
      var article = user.createArticle({ title: 'Hello' });
      expect(function() {
        user.articles;
      }).to.throw(/articles.*not yet.*loaded/i);
      expect(article).to.exist;
    });

    it('updates collection cache during create', function(done) {
      var article;
      user.articleObjects.fetch().then(function() {
        article = user.createArticle({ title: 'Hello' });
      })
      .then(function() {
        expect(user.articles).to.contain(article);
      })
      .done(done, done);
    });

    it('clears query cache during create', function() {
      var articleObjects = user.articleObjects;
      var article = user.createArticle({ title: 'Hello' });
      expect(user.articleObjects).to.not.equal(articleObjects);
      expect(article).to.exist;
    });

    it('allows add with existing objects', function(done) {
      var article = Article.fresh({ id: 5, title: 'Hello' });
      var promise = user.addArticle(article);

      // TODO: remove these once inverse_tests are working
      // these are set after the promise is executed
      expect(article.authorId).to.not.exist;
      expect(article.author).to.not.exist;

      promise.then(function() {
        // TODO: remove these once inverse_tests are working
        expect(article.authorId).to.eql(user.id);
        expect(article.author).to.equal(user);
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_id" = ? ' +
           'WHERE "id" = ?', [1, 5]]
        ]);
      })
      .done(done, done);
    });

    it('allows add with multiple existing objects', function(done) {
      var article1 = Article.fresh({ id: 5, title: 'Hello' });
      var article2 = Article.fresh({ id: 8, title: 'Hello' });
      user.addArticles(article1, article2).then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_id" = ? ' +
           'WHERE "id" IN (?, ?)', [1, 5, 8]]
        ]);
      })
      .done(done, done);
    });

    it('allows add with unsaved objects');

    it('updates collection cache during add', function(done) {
      var article = Article.fresh({ id: 5, title: 'Hello' });
      user.articleObjects.fetch().then(function() {
        return user.addArticle(article);
      })
      .then(function() {
        expect(user.articles).to.contain(article);
      })
      .done(done, done);
    });

    it('clears query cache during add', function(done) {
      var article = Article.fresh({ id: 5, title: 'Hello' });
      var articleObjects = user.articleObjects;
      articleObjects.fetch().then(function() {
        return user.addArticle(article);
      })
      .then(function() {
        expect(user.articleObjects).to.not.equal(articleObjects);
      })
      .done(done, done);
    });

    it('allows remove with existing objects', function(done) {
      var article = Article.fresh({ id: 5, title: 'Hello' });
      article.authorId = user.id;
      article.author = user;
      var promise = user.removeArticle(article);

      // TODO: remove these once inverse_tests are working
      // these are set after the promise is executed
      expect(article.authorId).to.exist;
      expect(article.author).to.exist;

      promise.then(function() {
        // TODO: remove these once inverse_tests are working
        expect(article.authorId).to.not.exist;
        expect(article.author).to.not.exist;
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_id" = ? ' +
           'WHERE "id" = ?', [undefined, 5]]
        ]);
      })
      .done(done, done);
    });

    it('allows remove with multiple existing objects', function(done) {
      var article1 = Article.fresh({ id: 5, title: 'Hello' });
      var article2 = Article.fresh({ id: 8, title: 'Hello' });
      user.removeArticles(article1, article2).then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_id" = ? ' +
           'WHERE "id" IN (?, ?)', [undefined, 5, 8]]
        ]);
      })
      .done(done, done);
    });

    it('allows remove with unsaved objects');

    it('updates collection cache during remove', function(done) {
      var article;
      user.articleObjects.fetch().then(function() {
        article = user.articles[0];
        return user.removeArticle(article);
      })
      .then(function() {
        expect(user.articles).to.not.contain(article);
      })
      .done(done, done);
    });

    it('clears query cache during remove', function(done) {
      var articleObjects = user.articleObjects;
      articleObjects.fetch().then(function() {
        return user.removeArticle(user.articles[0]);
      })
      .then(function() {
        expect(user.articleObjects).to.not.equal(articleObjects);
      })
      .done(done, done);
    });

    it('allows clear', function(done) {
      user.clearArticles().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['DELETE FROM "articles" WHERE "author_id" = ?', [1]]
        ]);
      })
      .done(done, done);
    });

    it('updates collection cache during clear', function(done) {
      user.articleObjects.fetch().then(function() {
        return user.clearArticles();
      })
      .then(function() {
        expect(user.articles).to.eql([]);
      })
      .done(done, done);
    });

    it('clears query cache during clear', function(done) {
      var articleObjects = user.articleObjects;
      articleObjects.fetch().then(function() {
        return user.clearArticles();
      })
      .then(function() {
        expect(user.articleObjects).to.not.equal(articleObjects);
      })
      .done(done, done);
    });
  });
});
