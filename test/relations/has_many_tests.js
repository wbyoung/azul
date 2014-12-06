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

    var hasMany = db.hasMany;
    var attr = db.attr;

    Article = db.model('article').reopen({
      title: attr(),
      authorKey: attr('author_num') // easy access to foreign key attr
    });
    User = db.model('user').reopen({
      username: attr(),
      articles: hasMany(Article, { foreignKey: 'author_num' })
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
      rows: [{ id: 1, title: 'Journal', 'author_num': 1 }]
    });
    adapter.intercept(/insert into "articles"/i, {
      fields: ['id'],
      rows: [{ id: 23 }]
    });
  });

  describe('definition', function() {
    it('does not need to provide name', function() {
      User.reopen({
        books: db.Model.hasMany()
      });
      expect(user.booksRelation._relatedModel).to.eql(db.model('book'));
    });

    it('calculates foreign key from inverse', function() {
      User.reopen({
        books: db.Model.hasMany({ inverse: 'writer' })
      });
      expect(user.booksRelation.foreignKey).to.eql('writer_id');
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
          ['SELECT * FROM "articles" WHERE "author_num" = ?', [1]]
        ]);
      })
      .done(done, done);
    });

    it('caches related objects', function(done) {
      User.objects.with('articles').fetch().get('0').then(function(foundUser) {
        expect(foundUser.id).to.eql(1);
        expect(foundUser.username).to.eql('wbyoung');
        expect(foundUser.articles).to.eql([
          Article.fresh({ id: 1, title: 'Journal', authorKey: 1 })
        ]);
      })
      .done(done, done);
    });

    it('works with multiple models each having multiple related objects', function(done) {
      var usersRegex = /select.*from "users".*order by "id"/i;
      var articlesRegex =
        /select.*from "articles" where "author_num" in \(\?, \?, \?\)/i;
      adapter.intercept(usersRegex, {
        fields: ['id', 'username'],
        rows: [
          { id: 1, username: 'wbyoung' },
          { id: 2, username: 'kate' },
          { id: 4, username: 'sam' },
        ]
      });
      adapter.intercept(articlesRegex, {
        fields: ['id', 'title', 'author_num'],
        rows: [
          { id: 3, title: 'Announcing Azul', 'author_num': 1 },
          { id: 5, title: 'Node.js ORM', 'author_num': 1 },
          { id: 9, title: 'Delicious Pancakes', 'author_num': 2 },
          { id: 8, title: 'Awesome Margaritas', 'author_num': 2 },
          { id: 4, title: 'Tasty Kale Salad', 'author_num': 2 },
          { id: 6, title: 'The Bipartisan System', 'author_num': 4 },
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

    it('works when some the objects have an empty result set', function(done) {
      var usersRegex = /select.*from "users".*order by "id"/i;
      var articlesRegex =
        /select.*from "articles" where "author_num" in \(\?, \?, \?\, \?\)/i;
      adapter.intercept(usersRegex, {
        fields: ['id', 'username'],
        rows: [
          { id: 1, username: 'wbyoung' },
          { id: 2, username: 'kate' },
          { id: 3, username: 'vanessa' },
          { id: 4, username: 'sam' },
        ]
      });
      adapter.intercept(articlesRegex, {
        fields: ['id', 'title', 'author_num'],
        rows: [
          { id: 3, title: 'Announcing Azul', 'author_num': 1 },
          { id: 5, title: 'Node.js ORM', 'author_num': 1 },
          { id: 6, title: 'The Bipartisan System', 'author_num': 4 },
        ]
      });

      User.objects.with('articles').orderBy('id').fetch().then(function(users) {
        expect(users[0].username).to.eql('wbyoung');
        expect(users[1].username).to.eql('kate');
        expect(users[2].username).to.eql('vanessa');
        expect(users[3].username).to.eql('sam');
        expect(_.map(users[0].articles, 'title')).to.eql([
          'Announcing Azul', 'Node.js ORM'
        ]);
        expect(_.map(users[1].articles, 'title')).to.eql([]);
        expect(_.map(users[2].articles, 'title')).to.eql([]);
        expect(_.map(users[3].articles, 'title')).to.eql([
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
          Article.fresh({ id: 1, title: 'Journal', authorKey: 1 })
        ]);
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "articles" WHERE "author_num" = ?', [1]]
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
          Article.fresh({ id: 1, title: 'Journal', authorKey: 1 })
        ]);
      })
      .done(done, done);
    });

    it('can be filtered', function(done) {
      articleObjects.where({ title: 'Azul' }).fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "articles" WHERE ("author_num" = ?) AND ' +
           '"title" = ?', [1, 'Azul']]
        ]);
      })
      .done(done, done);
    });

    it('allows update', function(done) {
      articleObjects.update({ title: 'Azul' }).then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "title" = ? ' +
           'WHERE "author_num" = ?', ['Azul', 1]]
        ]);
      })
      .done(done, done);
    });

    it('allows delete', function(done) {
      articleObjects.delete().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['DELETE FROM "articles" WHERE "author_num" = ?', [1]]
        ]);
      })
      .done(done, done);
    });
  });

  describe('helpers', function() {
    it('allows create', function() {
      var article = user.createArticle({ title: 'Hello' });
      expect(article.authorKey).to.eql(user.id);
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
      user.addArticle(article).then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_num" = ? ' +
           'WHERE "id" = ?', [1, 5]]
        ]);
        expect(article).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('does not try to repeat addition updates', function(done) {
      var article = Article.fresh({ id: 5, title: 'Hello' });
      user.addArticle(article);
      user.save().then(function() {
        return user.save();
      })
      .then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_num" = ? ' +
           'WHERE "id" = ?', [1, 5]]
        ]);
        expect(user.articlesRelation._getInFlightData(user)).to.eql({
          clear: false,
          add: [],
          remove: []
        });
        expect(article).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('allows add with multiple existing objects', function(done) {
      var article1 = Article.fresh({ id: 5, title: 'Hello' });
      var article2 = Article.fresh({ id: 8, title: 'Hello' });
      user.addArticles(article1, article2).then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_num" = ? ' +
           'WHERE "id" IN (?, ?)', [1, 5, 8]]
        ]);
        expect(article1).to.have.property('dirty', false);
        expect(article2).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('allows add with unsaved objects', function(done) {
      var article = Article.fresh({ id: 12, title: 'Hello' });
      article.title = 'Renamed';
      user.addArticle(article).then(function() {
        // note that this expectation depends on ordering of object properties
        // which is not guaranteed to be a stable ordering.
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "title" = ?, "author_num" = ? ' +
           'WHERE "id" = ?', ['Renamed', 1, 12]]
        ]);
        expect(article).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('allows add with created objects', function(done) {
      var article = Article.create({ title: 'Hello' });
      user.addArticle(article).then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['INSERT INTO "articles" ("title", "author_num") VALUES (?, ?) ' +
           'RETURNING "id"', ['Hello', 1]]
        ]);
        expect(article).to.have.property('dirty', false);
      })
      .done(done, done);
    });

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
      var chachedValues = [articleObjects];

      articleObjects.fetch()
      .then(function() { user.addArticle(article); })
      .then(function() {
        expect(chachedValues).to.not.contain(user.articleObjects);
        chachedValues.push(user.articleObjects);
      })
      .then(function() { return user.save(); })
      .then(function() {
        expect(chachedValues).to.not.contain(user.articleObjects);
      })
      .done(done, done);
    });

    it('allows remove with existing objects', function(done) {
      var article = Article.fresh({ id: 5, title: 'Hello', authorKey: user.id });
      user.removeArticle(article).then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_num" = ? ' +
           'WHERE "id" = ?', [undefined, 5]]
        ]);
        expect(article).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('does not try to repeat removal updates', function(done) {
      var article = Article.fresh({ id: 5, title: 'Hello' });
      user.removeArticle(article);
      user.save().then(function() {
        return user.save();
      })
      .then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_num" = ? ' +
           'WHERE "id" = ?', [undefined, 5]]
        ]);
        expect(user.articlesRelation._getInFlightData(user)).to.eql({
          clear: false,
          add: [],
          remove: []
        });
        expect(article).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('allows remove with multiple existing objects', function(done) {
      var article1 = Article.fresh({ id: 5, title: 'Hello' });
      var article2 = Article.fresh({ id: 8, title: 'Hello' });
      user.removeArticles(article1, article2).then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_num" = ? ' +
           'WHERE "id" IN (?, ?)', [undefined, 5, 8]]
        ]);
        expect(article1).to.have.property('dirty', false);
        expect(article2).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('allows remove with unsaved objects', function(done) {
      var article = Article.fresh({ id: 12, title: 'Hello' });
      article.title = 'Renamed';
      user.removeArticle(article).then(function() {
        // note that this expectation depends on ordering of object properties
        // which is not guaranteed to be a stable ordering.
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "title" = ?, "author_num" = ? ' +
           'WHERE "id" = ?', ['Renamed', undefined, 12]]
        ]);
        expect(article).to.have.property('dirty', false);
      })
      .done(done, done);
    });

    it('allows remove with created objects', function(done) {
      var article = Article.create({ title: 'Hello' });
      user.removeArticle(article).then(function() {
        expect(adapter.executedSQL()).to.eql([
        ]);
        expect(article).to.have.property('persisted', false);
      })
      .done(done, done);
    });

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
      var chachedValues = [articleObjects];

      articleObjects.fetch()
      .then(function() { user.removeArticle(user.articles[0]); })
      .then(function() {
        expect(chachedValues).to.not.contain(user.articleObjects);
        chachedValues.push(user.articleObjects);
      })
      .then(function() { return user.save(); })
      .then(function() {
        expect(chachedValues).to.not.contain(user.articleObjects);
      })
      .done(done, done);
    });

    it('allows clear', function(done) {
      user.clearArticles().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_num" = ? ' +
           'WHERE "author_num" = ?', [undefined, 1]]
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
      var chachedValues = [articleObjects];

      articleObjects.fetch()
      .then(function() { user.clearArticles(); })
      .then(function() {
        expect(chachedValues).to.not.contain(user.articleObjects);
        chachedValues.push(user.articleObjects);
      })
      .then(function() { return user.save(); })
      .then(function() {
        expect(chachedValues).to.not.contain(user.articleObjects);
      })
      .done(done, done);
    });

    it('does not clear query cache during save', function(done) {
      var articleObjects = user.articleObjects;
      user.save().then(function() {
        expect(articleObjects).to.equal(user.articleObjects);
      })
      .done(done, done);
    });

    it('processes a complex sequence using add, remove, and clear', function(done) {
      var article1 = Article.fresh({ id: 1, title: '#1' });
      var article2 = Article.fresh({ id: 2, title: '#2' });
      var article3 = Article.fresh({ id: 3, title: '#3' });
      var article4 = Article.fresh({ id: 4, title: '#4' });
      var article5 = Article.fresh({ id: 5, title: '#5' });
      var article6 = Article.fresh({ id: 6, title: '#6' });
      var article7 = Article.fresh({ id: 7, title: '#7' });

      user.addArticles(article1, article2, article3, article7);
      user.removeArticle(article1);
      user.addArticles(article4);
      user.clearArticles(); // clear makes nothing above matter
      user.addArticle(article1);
      user.addArticles(article6, article7);
      user.removeArticles(article2, article5, article1, article4);
      user.addArticle(article2);
      user.removeArticles(article6);
      user.addArticle(article2);

      user.save().then(function() {
        var executed = adapter.executedSQL();
        var clear = executed[0];
        expect(clear).to.eql(
          ['UPDATE "articles" SET "author_num" = ? ' +
           'WHERE "author_num" = ?', [undefined, 1]]);
        // the order is not guaranteed between add & remove so they are sorted
        // based on the first argument (the argument corresponding to
        // SET "author_num" = ?)
        var remaining = executed.slice(1).sort(function(sql) {
          var args = sql[1];
          return args[0] === undefined;
        });
        expect(remaining).to.eql([
          ['UPDATE "articles" SET "author_num" = ? ' +
           'WHERE "id" IN (?, ?)', [1, 7, 2]],
          ['UPDATE "articles" SET "author_num" = ? ' +
           'WHERE "id" IN (?, ?)', [undefined, 5, 4]],
        ]);
      })
      .done(done, done);
    });
  });
});
