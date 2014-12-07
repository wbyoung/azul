'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var FakeAdapter = require('../fakes/adapter');
var Manager = require('../../lib/model/manager');
var BluebirdPromise = require('bluebird');

require('../helpers/model');

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
      email: attr('email_addr')
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
        Article.load({ id: 1, title: 'Existing Article' })
      ]);
    })
    .done(done, done);
  });

  it('has a `pk` property', function() {
    var article = Article.fresh({ id: 5, title: 'Azul News' });
    expect(article.pk).to.eql(5);
  });

  it('can set the `pk` property', function() {
    var article = Article.fresh({ id: 5, title: 'Azul News' });
    article.pk = 7;
    expect(article.pk).to.eql(7);
    expect(article.id).to.eql(7);
  });

  it('can set the `id` property', function() {
    var article = Article.fresh({ id: 5, title: 'Azul News' });
    article.id = 7;
    expect(article.id).to.eql(7);
  });

  it('can get objects through raw queries', function(done) {
    Article.objects.raw('select * from "articles"').then(function(articles) {
      expect(articles).to.eql([
        Article.load({ id: 1, title: 'Existing Article' })
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
      user.email = 'wbyoung@azuljs.com';
      expect(user.email).to.eql('wbyoung@azuljs.com');
      expect(user._attrs).to.have.property('email_addr', 'wbyoung@azuljs.com');
    });

    it('works with custom column via constructor', function() {
      var user = User.create({ email: 'wbyoung@azuljs.com' });
      expect(user.email).to.eql('wbyoung@azuljs.com');
      expect(user._attrs).to.have.property('email_addr', 'wbyoung@azuljs.com');
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

  it('specifies all attributes when creating objects', function(done) {
    var article = Article.create();
    article.save().then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['INSERT INTO "articles" ("title") VALUES (?) '+
         'RETURNING "id"', [undefined]]
      ]);
      expect(article.id).to.eql(34);
    })
    .done(done, done);
  });

  it('saving gives back the original object', function(done) {
    var article = Article.create({ title: 'Azul News' });
    article.save().then(function(result) {
      expect(result).to.equal(article);
    })
    .done(done, done);
  });

  it('can update objects', function(done) {
    var article = Article.fresh({ id: 5, title: 'Azul News' });
    article.title = 'Breaking Azul News';
    article.save().then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['UPDATE "articles" SET "title" = ? '+
         'WHERE "id" = ?', ['Breaking Azul News', 5]]
      ]);
    })
    .done(done, done);
  });

  it('specifies all attributes when updating objects', function(done) {
    var article = Article.fresh({ id: 5 });
    article.id = 5; // mark as dirty
    article.save().then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['UPDATE "articles" SET "title" = ? '+
         'WHERE "id" = ?', [undefined, 5]]
      ]);
    })
    .done(done, done);
  });

  it('marks fetched objects as persisted', function(done) {
    Article.objects.fetch().get('0').then(function(article) {
      expect(article.persisted).to.eql(true);
    })
    .done(done, done);
  });

  it('does not mark fetched objects as dirty', function(done) {
    Article.objects.fetch().get('0').then(function(article) {
      expect(article.dirty).to.eql(false);
    })
    .done(done, done);
  });

  it('marks updated objects as no longer being dirty', function(done) {
    var article = Article.fresh({ id: 5, title: 'Azul News' });
    article.title = 'Breaking Azul News';
    article.save().then(function() {
      expect(article.dirty).to.eql(false);
    })
    .done(done, done);
  });

  it('marks saved objects as persisted', function(done) {
    var article = Article.create({ title: 'Azul News' });
    expect(article.persisted).to.eql(false);
    article.save().then(function() {
      expect(article.persisted).to.eql(true);
    })
    .done(done, done);
  });

  it('does not perform updates on persisted objects', function(done) {
    var article = Article.fresh({ title: 'Azul News' });
    article.save().then(function() {
      expect(adapter.executedSQL()).to.eql([]);
    })
    .done(done, done);
  });

  it('cannot save while a save is in flight', function(done) {
    var article = Article.create({ title: 'Azul News' });
    article.save();
    article.save().throw(new Error('Expected save to fail'))
    .catch(function(e) {
      expect(e).to.match(/Cannot save.*article.*in flight/i);
    })
    .done(done, done);
  });
});
