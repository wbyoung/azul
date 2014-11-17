'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../lib/db');
var FakeAdapter = require('./fakes/adapter');
var Statement = require('../lib/db/grammar/statement');
var Manager = require('../lib/model/manager');
var BluebirdPromise = require('bluebird');

var db,
  adapter,
  Article,
  User;

describe('Model', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });

    var Model = db.Model;
    var hasMany = Model.hasMany;

    Article = db.Model.extend({});
    Article.reopenClass({ __name__: 'Article' });

    User = db.Model.extend({
      articles: hasMany(Article)
    });
    User.reopenClass({ __name__: 'User' });

    adapter.intercept(/select.*from "articles"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: 'Existing Article' }]
    });
  });

  it('knows its table', function() {
    expect(Article.tableName).to.eql('articles');
  });

  it('can get objects', function(done) {
    Article.objects.fetch().then(function(articles) {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles"', []]
      ]);
      // TODO: create doesn't do anything yet, so this really isn't testing
      // anything.
      expect(articles).to.eql([
        Article.create({ id: 1, title: 'Existing Article' })
      ]);
    })
    .done(done, done);
  });

  it('can get objects multiple times', function(done) {
    BluebirdPromise.all([
      Article.objects,
      Article.objects
    ])
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles"', []],
        ['SELECT * FROM "articles"', []]
      ]);
    })
    .done(done, done);
  });

  it('always gets a new query', function() {
    expect(Article.objects).to.not.equal(Article.objects);
  });

  describe('with a custom manager', function() {
    beforeEach(function() {
      var PublishedManager = Manager.extend({
        query: function() {
          return this._super().where({ published: true });
        }
      });
      Article.reopenClass({
        published: PublishedManager.create()
      });
    });

    it('executes custom SQL', function(done) {
      Article.published.fetch().then(function(/*articles*/) {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "articles" WHERE "published" = ?', [true]]
        ]);
      })
      .done(done, done);
    });
  });

  describe('with a custom table', function() {
    beforeEach(function() {
      Article.reopenClass({ tableName: 'article_table' });
    });
    it('knows its table', function() {
      expect(Article.tableName).to.eql('article_table');
    });
    it('still calculates other tables names', function() {
      expect(User.tableName).to.eql('users');
    });
    it('executes custom SQL', function(done) {
      Article.objects.fetch().then(function(/*articles*/) {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "article_table"', []]
        ]);
      })
      .done(done, done);
    });
  });

  it('has related methods', function() {
    var user = User.create();
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

  it.skip('can create objects', function() {
    var article = Article.create({ title: 'Azul News' });
    expect(article.save().sql()).to.eql(Statement.create(
      'INSERT INTO "articles" ("title") VALUES (?)', ['Azul News']
    ));
  });
});
