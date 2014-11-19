'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/db');
var FakeAdapter = require('../fakes/adapter');

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

    Article = db.Model.extend({});
    Article.reopenClass({ __name__: 'Article' });

    User = db.Model.extend({
      // TODO: what if article class have name yet
      articles: hasMany(Article, {
        inverse: 'author',
        foreignKey: 'author_id', // TODO: change to camel case?
        primaryKey: 'id'
      })
    });
    User.reopenClass({ __name__: 'User' });

    user = User.create({ id: 1 });
    articleObjects = user.articleObjects;

    adapter.intercept(/select.*from "articles"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: 'Existing Article' }]
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

  describe('relation', function() {

    it('fetches articles', function(done) {
      articleObjects.fetch().then(function(articles) {
        expect(articles).to.eql([
          Article.create({ id: 1, title: 'Existing Article' })
        ]);
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "articles" WHERE "author_id" = ?', [1]]
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

    it('allows create', function() {
      var article = articleObjects.create({ title: 'Hello' });
      expect(article.authorId).to.eql(user.id);
      expect(article.author).to.equal(user);
      expect(article).to.to.be.an.instanceOf(Article.__class__);
    });

    it('allows add with existing objects', function(done) {
      var article = Article.create({ id: 5, title: 'Hello' });

      // these are set after the query is executed
      expect(article.authorId).to.not.exist;
      expect(article.author).to.not.exist;

      articleObjects.add(article).then(function() {
        expect(article.authorId).to.eql(user.id);
        expect(article.author).to.equal(user);
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_id" = ? WHERE "id" = ?', [1, 5]]
        ]);
      })
      .done(done, done);
    });

    it('allows add with multiple existing objects', function(done) {
      var article1 = Article.create({ id: 5, title: 'Hello' });
      var article2 = Article.create({ id: 8, title: 'Hello' });
      articleObjects.add(article1, article2).then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_id" = ? WHERE "id" ' +
           'IN (?, ?)', [1, 5, 8]]
        ]);
      })
      .done(done, done);
    });

    it('allows add with unsaved objects');
    it('allows remove with existing objects');
    it('allows remove with unsaved objects');

    it('allows clear', function(done) {
      articleObjects.clear().then(function() {
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

    it('allows clear', function(done) {
      user.clearArticles().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['DELETE FROM "articles" WHERE "author_id" = ?', [1]]
        ]);
      })
      .done(done, done);
    });

    it('allows add with existing objects');
    it('allows add with unsaved objects');
    it('allows remove with existing objects');
    it('allows remove with unsaved objects');
  });
});
