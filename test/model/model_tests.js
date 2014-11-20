'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var FakeAdapter = require('../fakes/adapter');
var Manager = require('../../lib/model/manager');
var BluebirdPromise = require('bluebird');

var db,
  attr,
  adapter,
  Article,
  User;

describe('Model', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
    attr = db.Model.attr;

    Article = db.Model.extend({
      title: attr()
    });
    Article.reopenClass({ __name__: 'Article' });

    User = db.Model.extend({
      username: attr(),
      authorId: attr('author_id')
    });
    User.reopenClass({ __name__: 'User' });

    adapter.intercept(/select.*from "articles"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: 'Existing Article' }]
    });

    adapter.intercept(/insert into "articles".*returning "id"/i, {
      fields: ['id'],
      rows: [{ id: 34 }]
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

  describe('attribute storage', function() {
    it('works with custom column via setters', function() {
      var user = User.create();
      user.authorId = 1;
      expect(user.authorId).to.eql(1);
      expect(user._attrs).to.have.property('author_id', 1);
    });

    it('works with custom column via constructor', function() {
      var user = User.create({ authorId: 1 });
      expect(user.authorId).to.eql(1);
      expect(user._attrs).to.have.property('author_id', 1);
    });

    it('works via setters', function() {
      var user = User.create();
      user.username = 'wbyoung';
      expect(user.username).to.eql('wbyoung');
      expect(user._attrs).to.have.property('username', 'wbyoung');
    });

    it('works via constructor', function() {
      var user = User.create({ username: 'wbyoung' });
      expect(user.username).to.eql('wbyoung');
      expect(user._attrs).to.have.property('username', 'wbyoung');
    });
  });

  it('can create objects', function(done) {
    var article = Article.create({ title: 'Azul News' });
    article.save().then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['INSERT INTO "articles" ("title") VALUES (?) '+
         'RETURNING "id"', ['Azul News']]
      ]);
      expect(article.id).to.eql(34);
    })
    .done(done, done);
  });
});
