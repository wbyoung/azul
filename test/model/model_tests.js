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

    adapter.intercept(/insert into "articles".*returning "identifier"/i, {
      fields: ['identifier'],
      rows: [{ identifier: 48 }]
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

  it('can find an object', function(done) {
    Article.objects.find(1).then(function(article) {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles" WHERE "id" = ? LIMIT 1', [1]]
      ]);
      expect(article)
        .to.eql(Article.load({ id: 1, title: 'Existing Article' }));
    })
    .done(done, done);
  });

  it('gives an error when find fails', function(done) {
    adapter.intercept(/select.*from "articles"/i, {
      fields: ['id', 'title'],
      rows: []
    });
    Article.objects.find(1)
    .throw(new Error('Expected query to fail.'))
    .catch(function(e) {
      expect(e.message).to.match(/no results/i);
      expect(e.code).to.eql('NO_RESULTS_FOUND');
      expect(e.sql).to.eql('SELECT * FROM "articles" ' +
        'WHERE "id" = ? LIMIT 1');
      expect(e.args).to.eql([1]);
    })
    .then(done, done);
  });

  it('can find/create an object when one does not exist', function(done) {
    adapter.intercept(/select.*from "articles"/i, {
      fields: ['id', 'title'],
      rows: []
    });

    Article.objects.findOrCreate({ title: 'News' }).then(function(article) {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles" WHERE "title" = ? LIMIT 1', ['News']],
        ['INSERT INTO "articles" ("title") VALUES (?) ' +
         'RETURNING "id"', ['News']],
      ]);
      expect(article)
        .to.eql(Article.load({ id: 34, title: 'News' }));
    })
    .done(done, done);
  });

  it('can find/create an object and assign defaults', function(done) {
    adapter.intercept(/select.*from "articles"/i, {
      fields: ['id', 'title'],
      rows: []
    });

    Article.reopen({ author: db.attr() });
    Article.objects.findOrCreate({ title: 'News' }, { author: 'Me' })
    .then(function(article) {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles" WHERE "title" = ? LIMIT 1', ['News']],
        ['INSERT INTO "articles" ("title", "author") VALUES (?, ?) ' +
         'RETURNING "id"', ['News', 'Me']],
      ]);
      expect(article)
        .to.eql(Article.load({ id: 34, title: 'News', author: 'Me' }));
    })
    .done(done, done);
  });

  it('find/create does not swallow errors', function(done) {
    adapter.intercept(/select.*from "articles"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 1, title: 'Article 1' }, { id: 2, title: 'Article 2' }]
    });

    Article.objects.findOrCreate({ title: 'News' }, { author: 'Me' })
    .throw(new Error('Expected query to fail.'))
    .catch(function(e) {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles" WHERE "title" = ? LIMIT 1', ['News']]
      ]);
      expect(e.code).to.eql('MULTIPLE_RESULTS_FOUND');
    })
    .done(done, done);
  });

  it('can find/create an object when one does not exist', function(done) {
    Article.objects.findOrCreate({ title: 'Existing Article' })
    .then(function(article) {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles" WHERE "title" = ? ' +
         'LIMIT 1', ['Existing Article']],
      ]);
      expect(article)
        .to.eql(Article.load({ id: 1, title: 'Existing Article' }));
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

  it('can query to load objects via raw', function(done) {
    Article.objects.raw('select * from "articles"').then(function(articles) {
      expect(articles).to.eql([
        Article.load({ id: 1, title: 'Existing Article' })
      ]);
    })
    .done(done, done);
  });

  it('can query to load objects via all', function(done) {
    // expecting that the ['pk'] below gets ignored
    Article.objects.all(['pk']).then(function(articles) {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles"', []],
      ]);
      expect(articles).to.eql([
        Article.load({ id: 1, title: 'Existing Article' })
      ]);
    })
    .done(done, done);
  });

  it('can query to load objects via select', function(done) {
    adapter.intercept(/select "id" from "articles"/i, {
      fields: ['id'],
      rows: [{ id: 1 }]
    });
    Article.objects.select(['pk']).then(function(result) {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT "id" FROM "articles"', []],
      ]);
      expect(result).to.eql([
        { id: 1 }
      ]);
    })
    .done(done, done);
  });

  it('can query to insert objects', function(done) {
    Article.objects.insert({ pk: 3 }).then(function(result) {
      expect(adapter.executedSQL()).to.eql([
        ['INSERT INTO "articles" ("id") VALUES (?)', [3]],
      ]);
      expect(result).to.eql([]); // transform applied, empty rows result
    })
    .done(done, done);
  });

  it('can query to update objects', function(done) {
    Article.objects.update({ pk: 3 }).then(function(result) {
      expect(adapter.executedSQL()).to.eql([
        ['UPDATE "articles" SET "id" = ?', [3]],
      ]);
      expect(result).to.eql([]); // transform applied, empty rows result
    })
    .done(done, done);
  });

  it('can query to delete objects', function(done) {
    Article.objects.delete().then(function(result) {
      expect(adapter.executedSQL()).to.eql([
        ['DELETE FROM "articles"', []],
      ]);
      expect(result).to.eql([]); // transform applied, empty rows result
    })
    .done(done, done);
  });

  it('transforms fields given after select', function(done) {
    Article.reopen({ author: db.attr('writer') });
    Article.objects.select(['pk']).where({ author: 5 }).then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT "id" FROM "articles" WHERE "writer" = ?', [5]],
      ]);
    })
    .done(done, done);
  });

  it('only transforms fields given before unbind with select', function(done) {
    Article.reopen({ author: db.attr('writer') });
    Article.objects.select(['pk']).unbind().where({ author: 5 }).then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT "id" FROM "articles" WHERE "author" = ?', [5]],
      ]);
    })
    .done(done, done);
  });

  it('transforms fields given after update', function(done) {
    Article.reopen({ author: db.attr('writer') });
    Article.objects.update({ pk: 3 }).set({ author: 2 }).where({ author: 5 })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['UPDATE "articles" SET "id" = ?, "writer" = ? ' +
         'WHERE "writer" = ?', [3, 2, 5]],
      ]);
    })
    .done(done, done);
  });

  it('only transforms fields given before unbind with update', function(done) {
    Article.reopen({ author: db.attr('writer') });
    Article.objects.update({ pk: 3 }).unbind()
    .set({ author: 2 }).where({ author: 5 })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['UPDATE "articles" SET "id" = ?, "author" = ? ' +
         'WHERE "author" = ?', [3, 2, 5]],
      ]);
    })
    .done(done, done);
  });

  it('transforms fields given after insert', function(done) {
    Article.reopen({ author: db.attr('writer') });
    Article.objects.insert({ pk: 3 }).values({ id: 1, author: 2 })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['INSERT INTO "articles" ("id", "writer") ' +
         'VALUES (?, ?), (?, ?)', [3, undefined, 1, 2]],
      ]);
    })
    .done(done, done);
  });

  it('only transforms fields given before unbind with insert', function(done) {
    Article.reopen({ author: db.attr('writer') });
    Article.objects.insert({ pk: 3 }).unbind().values({ id: 1, author: 2 })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['INSERT INTO "articles" ("id", "author") ' +
         'VALUES (?, ?), (?, ?)', [3, undefined, 1, 2]],
      ]);
    })
    .done(done, done);
  });

  it('transforms fields given after delete', function(done) {
    Article.reopen({ author: db.attr('writer') });
    Article.objects.where({ pk: 2 }).delete().where({ author: 5 })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['DELETE FROM "articles" WHERE ("id" = ?) AND ("writer" = ?)', [2, 5]],
      ]);
    })
    .done(done, done);
  });

  it('only transforms fields given before unbind with delete', function(done) {
    Article.reopen({ author: db.attr('writer') });
    Article.objects.where({ pk: 2 }).unbind().delete().where({ author: 5 })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['DELETE FROM "articles" WHERE ("id" = ?) AND ("author" = ?)', [2, 5]],
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
      Article.reopen({ published: attr() });
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

  describe('with a objects replaced by a custom manager', function() {
    beforeEach(function() {
      var PublishedManager = Manager.extend({
        query: function() {
          return this._super().where({ published: true });
        }
      });
      Article.reopen({ published: attr() });
      Article.reopenClass({
        objects: PublishedManager.create(),
        allObjects: Manager.create()
      });
    });

    it('executes custom SQL', function(done) {
      Article.objects.fetch().then(function(/*articles*/) {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "articles" WHERE "published" = ?', [true]]
        ]);
      })
      .done(done, done);
    });

    it('executes standard SQL through extra manager', function(done) {
      Article.allObjects.fetch().then(function(/*articles*/) {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT * FROM "articles"', []]
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
    it('includes undefined pk value', function() {
      var user = User.create();
      expect(user.attrs).to.haveOwnProperty('id');
      expect(user.attrs.id).to.equal(undefined);
    });

    it('allows override of attribute initializers', function() {
      User.reopen({
        usernameInit: function() { this.username = 'anonymous'; }
      });
      var user = User.create();
      expect(user.attrs.username).to.equal('anonymous');
      expect(user.dirty).to.be.false;
    });

    it('works with custom column via setters', function() {
      var user = User.create();
      user.email = 'wbyoung@azuljs.com';
      expect(user.email).to.eql('wbyoung@azuljs.com');
      expect(user.attrs).to.have.property('email_addr', 'wbyoung@azuljs.com');
    });

    it('works with custom column via constructor', function() {
      var user = User.create({ email: 'wbyoung@azuljs.com' });
      expect(user.email).to.eql('wbyoung@azuljs.com');
      expect(user.attrs).to.have.property('email_addr', 'wbyoung@azuljs.com');
    });

    it('works via setters', function() {
      var user = User.create();
      user.username = 'wbyoung';
      expect(user.username).to.eql('wbyoung');
      expect(user.attrs).to.have.property('username', 'wbyoung');
    });

    it('works via constructor', function() {
      var user = User.create({ username: 'wbyoung' });
      expect(user.username).to.eql('wbyoung');
      expect(user.attrs).to.have.property('username', 'wbyoung');
    });

    it('converts attributes to underscore case by default', function() {
      Article.reopen({ authorName: db.attr() });
      var article = Article.create({ authorName: 'Whitney' });
      expect(article.attrs).to.have.property('author_name', 'Whitney');
    });

    it('respects given attribute name', function() {
      Article.reopen({ name: db.attr('authorName') });
      var article = Article.create({ name: 'Whitney' });
      expect(article.attrs).to.have.property('authorName', 'Whitney');
    });

    it('can handles `false` as an attribute value', function() {
      Article.reopen({ published: db.attr() });
      var article = Article.create({ id: 5, published: false });
      expect(article.published).to.equal(false);
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

  it('updates created objects with primary key specified', function(done) {
    var article = Article.create({ id: 12, title: 'Azul News' });
    article.save().then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['UPDATE "articles" SET "title" = ? WHERE "id" = ?', ['Azul News', 12]]
      ]);
      expect(article.id).to.eql(12);
    })
    .done(done, done);
  });

  it('requires attributes in order to be saved', function(done) {
    var Model = db.model('invalidModel', {});
    var model = Model.create({ value: 'hello' });
    model.save()
    .throw(new Error('Expected model save to fail'))
    .catch(function(e) {
      expect(e).to.match(/invalidModel has no attributes.*model.*defined/i);
    })
    .then(done, done);
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

  it('can create objects with a custom pk', function(done) {
    Article.reopen({ pk: attr('identifier') });
    Article.reopen({ identifier: attr('identifier') });

    var article = Article.create({ title: 'Azul News' });
    article.save().then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['INSERT INTO "articles" ("title") VALUES (?) '+
         'RETURNING "identifier"', ['Azul News']]
      ]);
      expect(article.pk).to.eql(48);
      expect(article.identifier).to.eql(48);
    })
    .done(done, done);
  });

  it('can create objects in a transaction', function(done) {
    var begin = db.query.begin();
    var transaction = begin.transaction();
    var article = Article.create({ title: 'Azul News' });
    var clientId = FakeAdapter.currentClientId;

    adapter.intercept(/.*/, function(client) {
      expect(client.id).to.eql(clientId);
    });

    begin.execute()
    .then(function() {
      return article.save({ transaction: transaction });
    })
    .then(function() { return transaction.commit(); })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['BEGIN', []],
        ['INSERT INTO "articles" ("title") VALUES (?) '+
         'RETURNING "id"', ['Azul News']],
        ['COMMIT', []],
      ]);
      expect(article.id).to.eql(34);
    })
    .done(done, done);
  });

  it('can get with a custom query', function(done) {
    Article.reopen({ headline: db.attr() });
    Article.objects.where({ id: 5, 'headline': 7 }).fetch().then(function(articles) {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles" WHERE "id" = ? ' +
         'AND "headline" = ?', [5, 7]]
      ]);
      expect(articles).to.eql([
        Article.load({ id: 1, title: 'Existing Article' })
      ]);
    })
    .done(done, done);
  });

  it('can get with a custom query using falsey values', function(done) {
    Article.reopen({ headline: db.attr() });
    Article.objects.where({ 'headline': 0 }).fetch().then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles" WHERE "headline" = ?', [0]]
      ]);
    })
    .done(done, done);
  });

  it('can get via pk', function(done) {
    Article.objects.where({ pk: 5 }).fetch().then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles" WHERE "id" = ?', [5]]
      ]);
    })
    .done(done, done);
  });

  it('can get via pk using custom pk', function(done) {
    Article.reopen({ pk: attr('identifier') });
    Article.objects.where({ pk: 5 }).fetch().then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles" WHERE "identifier" = ?', [5]]
      ]);
    })
    .done(done, done);
  });

  it('can get via id using custom pk', function(done) {
    Article.reopen({ pk: attr('identifier') });
    Article.objects.where({ id: 5 }).fetch().then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles" WHERE "identifier" = ?', [5]]
      ]);
    })
    .done(done, done);
  });

  it('does not translate values qualified by table name', function(done) {
    Article.reopen({ pk: attr('identifier') });
    Article.objects.where({ 'articles.pk': 5 }).fetch().then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['SELECT * FROM "articles" WHERE "articles"."pk" = ?', [5]]
      ]);
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

  it('can update via query', function(done) {
    Article.objects.update({ title: 'Breaking News' })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['UPDATE "articles" SET "title" = ?', ['Breaking News']]
      ]);
    })
    .done(done, done);
  });

  it('converts fields when updating via query', function(done) {
    Article.reopen({ headline: attr('title') });
    Article.objects.where({ headline: 'News' }).update({ headline: 'Breaking News' })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['UPDATE "articles" SET "title" = ? ' +
         'WHERE "title" = ?', ['Breaking News', 'News']]
      ]);
    })
    .done(done, done);
  });

  it('converts fields specified after update on query', function(done) {
    Article.reopen({ headline: attr('title') });
    Article.objects.update().where({ headline: 'News' }).set({ headline: 'Breaking News' })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['UPDATE "articles" SET "title" = ? ' +
         'WHERE "title" = ?', ['Breaking News', 'News']]
      ]);
    })
    .done(done, done);
  });

  it('does not convert fields specified after unbind on update query', function(done) {
    Article.reopen({ headline: attr('title') });
    Article.objects.update().unbind()
    .where({ headline: 'News' })
    .set({ headline: 'Breaking News' })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['UPDATE "articles" SET "headline" = ? ' +
         'WHERE "headline" = ?', ['Breaking News', 'News']]
      ]);
    })
    .done(done, done);
  });

  it('can insert via query', function(done) {
    Article.objects.insert({ title: 'Breaking News' })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['INSERT INTO "articles" ("title") VALUES (?)', ['Breaking News']]
      ]);
    })
    .done(done, done);
  });

  it('converts fields when inserting via query', function(done) {
    Article.reopen({ headline: attr('title') });
    Article.objects.insert({ headline: 'Breaking News' })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['INSERT INTO "articles" ("title") VALUES (?)', ['Breaking News']]
      ]);
    })
    .done(done, done);
  });

  it('converts fields specified after initial insert', function(done) {
    Article.reopen({ headline: attr('title') });
    Article.objects.insert([]).values({ headline: 'Breaking News' })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['INSERT INTO "articles" ("title") VALUES (?)', ['Breaking News']]
      ]);
    })
    .done(done, done);
  });

  it('does not convert fields specified after unbind on insert query', function(done) {
    Article.reopen({ headline: attr('title') });
    Article.objects.unbind().insert({ headline: 'Breaking News' })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['INSERT INTO "articles" ("headline") VALUES (?)', ['Breaking News']]
      ]);
    })
    .done(done, done);
  });

  it('can delete objects', function(done) {
    var article = Article.fresh({ id: 5, title: 'Azul News' });
    article.delete();
    article.save().then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['DELETE FROM "articles" WHERE "id" = ?', [5]]
      ]);
    })
    .done(done, done);
  });

  it('can delete objects with implicit save', function(done) {
    var article = Article.fresh({ id: 5, title: 'Azul News' });
    article.delete().then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['DELETE FROM "articles" WHERE "id" = ?', [5]]
      ]);
    })
    .done(done, done);
  });

  it('can save multiple times after delete', function(done) {
    var article = Article.fresh({ id: 5, title: 'Azul News' });
    article.delete()
    .then(function() { return article.save(); })
    .then(function() { return article.save(); })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['DELETE FROM "articles" WHERE "id" = ?', [5]]
      ]);
    })
    .done(done, done);
  });

  it('can delete multiple times without causing problems', function(done) {
    var article = Article.fresh({ id: 5, title: 'Azul News' });
    article.delete()
    .then(function() { return article.delete(); })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['DELETE FROM "articles" WHERE "id" = ?', [5]]
      ]);
    })
    .done(done, done);
  });

  it('does not update objects after delete', function(done) {
    var article = Article.fresh({ id: 5, title: 'Azul News' });
    article.delete()
    .then(function() {
      article.title = 'Changed after delete';
      return article.save();
    })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['DELETE FROM "articles" WHERE "id" = ?', [5]]
      ]);
    })
    .done(done, done);
  });

  it('can delete via query', function(done) {
    Article.objects.delete()
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['DELETE FROM "articles"', []]
      ]);
    })
    .done(done, done);
  });

  it('converts fields when deleting via query', function(done) {
    Article.reopen({ headline: attr('title') });
    Article.objects.where({ headline: 'News' }).delete()
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['DELETE FROM "articles" WHERE "title" = ?', ['News']]
      ]);
    })
    .done(done, done);
  });

  it('converts fields specified after delete on query', function(done) {
    Article.reopen({ headline: attr('title') });
    Article.objects.delete().where({ headline: 'News' })
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['DELETE FROM "articles" WHERE "title" = ?', ['News']]
      ]);
    })
    .done(done, done);
  });

  it('does not convert fields specified after unbind on delete query', function(done) {
    Article.reopen({ headline: attr('title') });
    Article.objects.unbind().where({ headline: 'News' }).delete()
    .then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['DELETE FROM "articles" WHERE "headline" = ?', ['News']]
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
    var article = Article.fresh({ id: 2, title: 'Azul News' });
    article.save().then(function() {
      expect(adapter.executedSQL()).to.eql([]);
    })
    .done(done, done);
  });

  it('can force an update during save', function(done) {
    var article = Article.create({ title: 'Azul News' });
    article.save({ method: 'update' }).then(function() {
      expect(adapter.executedSQL()).to.eql([
        ['UPDATE "articles" SET "title" = ? ' +
         'WHERE "id" = ?', ['Azul News', undefined]]
      ]);
      expect(article.id).to.eql(undefined);
    })
    .done(done, done);
  });

  it('can force an insert during save', function(done) {
    var article = Article.create({ id: 12, title: 'Azul News' });
    article.save({ method: 'insert' }).then(function() {
      expect(adapter.executedSQL()).to.eql([
        // note that this expectation depends on ordering of object
        // properties which is not guaranteed to be a stable ordering.
        ['INSERT INTO "articles" ("id", "title") ' +
         'VALUES (?, ?) RETURNING "id"', [12, 'Azul News']]
      ]);
      expect(article.id).to.eql(34); // fake adapter still returning 34 for id
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
