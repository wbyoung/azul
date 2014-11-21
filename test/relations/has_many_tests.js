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

var withAuthor = function(authorId, attrs) {
  var authorAttr = _.object([['author_id', authorId]]);
  return _.extend(attrs, authorAttr);
};

describe('Model.hasMany', function() {
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
    user = User.create({ id: 1 }).fresh;
    articleObjects = user.articleObjects;
  });

  beforeEach(function() {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'username'],
      rows: [{ id: 1, username: 'wbyoung' }]
    });
    adapter.intercept(/select.*from "articles"/i, {
      fields: ['id', 'title'],
      rows: [withAuthor(1, { id: 1, title: 'Journal' })]
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
          Article.create({ id: 1, title: 'Journal', authorId: 1 }).fresh
        ]);
      })
      .done(done, done);
    });

    it('works with multiple users each authoring multiple articles', function(done) {
      adapter.intercept(/select.*from "users".*order by "id"/i, {
        fields: ['id', 'username'],
        rows: [
          { id: 1, username: 'wbyoung' },
          { id: 2, username: 'kate' },
          { id: 4, username: 'sam' },
        ]
      });
      adapter.intercept(/select.*from "articles"/i, {
        fields: ['id', 'title', 'author_id'],
        rows: [
          withAuthor(1, { id: 3, title: 'Announcing Azul' }),
          withAuthor(1, { id: 5, title: 'Node.js ORM' }),
          withAuthor(2, { id: 9, title: 'Delicious Pancakes' }),
          withAuthor(2, { id: 8, title: 'Awesome Margaritas' }),
          withAuthor(2, { id: 5, title: 'Tasty Kale Salad' }),
          withAuthor(4, { id: 6, title: 'The Bipartisan System' }),
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

    it('fetches articles', function(done) {
      articleObjects.fetch().then(function(articles) {
        expect(articles).to.eql([
          Article.create({ id: 1, title: 'Journal', authorId: 1 }).fresh
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

    it('throws when attempting to access un-loaded articles', function() {
      expect(function() {
        user.articles;
      }).to.throw(/articles.*not yet.*loaded/i);
    });

    it('allows access loaded articles', function(done) {
      articleObjects.fetch().then(function() {
        expect(user.articles).to.eql([
          Article.create({ id: 1, title: 'Journal', authorId: 1 }).fresh
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
      expect(article.authorId).to.eql(user.id);
      expect(article.author).to.equal(user);
      expect(article).to.to.be.an.instanceOf(Article.__class__);
    });

    it('allows add with existing objects', function(done) {
      var article = Article.create({ id: 5, title: 'Hello' }).fresh;
      var query = user.addArticle(article);

      // these are set after the query is executed
      expect(article.authorId).to.not.exist;
      expect(article.author).to.not.exist;

      query.then(function() {
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
      var article1 = Article.create({ id: 5, title: 'Hello' }).fresh;
      var article2 = Article.create({ id: 8, title: 'Hello' }).fresh;
      user.addArticles(article1, article2).then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_id" = ? ' +
           'WHERE "id" IN (?, ?)', [1, 5, 8]]
        ]);
      })
      .done(done, done);
    });

    it('allows add with unsaved objects');

    it('allows remove with existing objects', function(done) {
      var article = Article.create({ id: 5, title: 'Hello' }).fresh;
      article.authorId = user.id;
      article.author = user;
      var query = user.removeArticle(article);

      // these are set after the query is executed
      expect(article.authorId).to.exist;
      expect(article.author).to.exist;

      query.then(function() {
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
      var article1 = Article.create({ id: 5, title: 'Hello' }).fresh;
      var article2 = Article.create({ id: 8, title: 'Hello' }).fresh;
      user.removeArticles(article1, article2).then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_id" = ? ' +
           'WHERE "id" IN (?, ?)', [undefined, 5, 8]]
        ]);
      })
      .done(done, done);
    });

    it('allows remove with unsaved objects');

    it('allows clear', function(done) {
      user.clearArticles().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['DELETE FROM "articles" WHERE "author_id" = ?', [1]]
        ]);
      })
      .done(done, done);
    });
  });
});
