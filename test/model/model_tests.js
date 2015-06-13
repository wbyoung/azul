'use strict';

require('../helpers');

var _ = require('lodash');
var util = require('util');
var Manager = require('../../lib/model/manager');
var Promise = require('bluebird');

var attr,
  Article,
  User;

describe('Model', __db(function() {
  /* global db, adapter */

  beforeEach(function() {
    attr = db.Model.attr;

    Article = db.Model.extend({
      title: attr(),
    });
    Article.reopenClass({ __name__: 'Article' });

    User = db.Model.extend({
      username: attr(),
      email: attr('email_addr'),
    });
    User.reopenClass({ __name__: 'User' });

    adapter.respond(/select.*from "articles"/i,
      [{ id: 1, title: 'Existing Article' }]);

    adapter.respond(/insert into "articles".*returning "id"/i,
      [{ id: 34 }]);

    adapter.respond(/insert into "articles".*returning "identifier"/i,
      [{ identifier: 48 }]);
  });

  it('knows its table', function() {
    Article.tableName.should.eql('articles');
  });

  it('knows all attributes', function() {
    Article.attrs.should.eql(['id', 'title']);
  });

  it('prefers last attr for attributes', function() {
    Article.reopen({
      identifier: db.attr('id'), // preferred
      headline: db.attr('title'), // preferred
      lastName: db.attr('last_name'),
      surname: db.attr('last_name'), // preferred
    });
    Article.attrs.should.eql(['identifier', 'headline', 'surname']);
  });

  it('instances can get json', function() {
    Article.reopen({ authorName: db.attr() });
    Article.create().json.should.eql({
      id: undefined,
      title: undefined,
      authorName: undefined,
    });
    var attrs = { id: 1, title: 'Welcome', authorName: 'Name' };
    var article = Article.create(attrs);
    article.json.should.eql(attrs);
    article.attrs.should.eql({
      'id': 1,
      'title': 'Welcome',
      'author_name': 'Name',
    });
    Article.attrs.should.eql(['id', 'title', 'authorName']);
  });

  it('can get objects', function() {
    return Article.objects.fetch().should.eventually
    .eql([Article.load({ id: 1, title: 'Existing Article' })])
    .meanwhile(adapter).should
    .have.executed('SELECT * FROM "articles"');
  });

  it('can find an object', function() {
    return Article.objects.find(1).should.eventually
    .eql(Article.load({ id: 1, title: 'Existing Article' }))
    .meanwhile(adapter).should
    .have.executed('SELECT * FROM "articles" WHERE "id" = ? LIMIT 1', [1]);
  });

  it('gives an error when find fails', function() {
    adapter.respond(/select.*from "articles"/i, []);
    return Article.objects.find(1)
    .should.eventually.be.rejected
    .and.eventually.match(/no results/i)
    .and.have.properties({
      code: 'NO_RESULTS_FOUND',
      sql: 'SELECT * FROM "articles" WHERE "id" = ? LIMIT 1',
      args: [1],
    });
  });

  it('can find/create an object when one does not exist', function() {
    adapter.respond(/select.*from "articles"/i, []);

    return Article.objects.findOrCreate({ title: 'News' }).should.eventually
    .eql(Article.load({ id: 34, title: 'News' }))
    .meanwhile(adapter).should
    .have.executed(
      'SELECT * FROM "articles" WHERE "title" = ? LIMIT 1', ['News'],
      'INSERT INTO "articles" ("title") VALUES (?) RETURNING "id"', ['News']);
  });

  it('can find/create an object and assign defaults', function() {
    adapter.respond(/select.*from "articles"/i, []);
    Article.reopen({ author: db.attr() });

    return Article.objects.findOrCreate({ title: 'News' }, { author: 'Me' })
    .should.eventually
    .eql(Article.load({ id: 34, title: 'News', author: 'Me' }))
    .meanwhile(adapter).should
    .have.executed(
      'SELECT * FROM "articles" WHERE "title" = ? LIMIT 1', ['News'],
      'INSERT INTO "articles" ("title", "author") VALUES (?, ?) ' +
        'RETURNING "id"', ['News', 'Me']);
  });

  it('find/create does not swallow errors', function() {
    adapter.respond(/select.*from "articles"/i,
      [{ id: 1, title: 'Article 1' }, { id: 2, title: 'Article 2' }]);
    return Article.objects.findOrCreate({ title: 'News' }, { author: 'Me' })
    .should.eventually
    .be.rejected.and.eventually
    .have.property('code', 'MULTIPLE_RESULTS_FOUND')
    .meanwhile(adapter).should
    .have.executed(
      'SELECT * FROM "articles" WHERE "title" = ? LIMIT 1', ['News']);
  });

  it('can find/create an object when one does exist', function() {
    return Article.objects.findOrCreate({ title: 'Existing Article' })
    .should.eventually
    .eql(Article.load({ id: 1, title: 'Existing Article' }))
    .meanwhile(adapter).should
    .have.executed('SELECT * FROM "articles" WHERE "title" = ? LIMIT 1',
      ['Existing Article']);
  });

  it('has a `pk` property', function() {
    var article = Article.$({ id: 5, title: 'Azul News' });
    article.pk.should.eql(5);
  });

  it('can set the `pk` property', function() {
    var article = Article.$({ id: 5, title: 'Azul News' });
    article.pk = 7;
    article.pk.should.eql(7);
    article.id.should.eql(7);
  });

  it('can set the `id` property', function() {
    var article = Article.$({ id: 5, title: 'Azul News' });
    article.id = 7;
    article.id.should.eql(7);
  });

  it('can query to load objects via raw', function() {
    return Article.objects.raw('select * from "articles"')
    .should.eventually
    .eql([Article.load({ id: 1, title: 'Existing Article' })]);
  });

  it('can query to load objects via all', function() {
    // expecting that the ['pk'] below gets ignored
    return Article.objects.all(['pk']).should.eventually
    .eql([Article.load({ id: 1, title: 'Existing Article' })])
    .meanwhile(adapter).should
    .have.executed('SELECT * FROM "articles"');
  });

  it('can query to load objects via select', function() {
    adapter.respond(/select "id" from "articles"/i, [{ id: 1 }]);
    return Article.objects.select(['pk']).should.eventually
    .eql([{ id: 1 }])
    .meanwhile(adapter).should
    .have.executed('SELECT "id" FROM "articles"');
  });

  it('can query to insert objects', function() {
    return Article.objects.insert({ pk: 3 }).should.eventually
    .eql([])
    .meanwhile(adapter).should
    .have.executed('INSERT INTO "articles" ("id") VALUES (?)', [3]);
  });

  it('can query to update objects', function() {
    return Article.objects.update({ pk: 3 }).should.eventually
    .eql([])
    .meanwhile(adapter).should
    .have.executed('UPDATE "articles" SET "id" = ?', [3]);
  });

  it('can query to delete objects', function() {
    return Article.objects.delete().should.eventually
    .eql([])
    .meanwhile(adapter).should
    .have.executed('DELETE FROM "articles"', []);
  });

  it('transforms fields given after select', function() {
    Article.reopen({ author: db.attr('writer') });
    return Article.objects.select(['pk']).where({ author: 5 })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('SELECT "id" FROM "articles" WHERE "writer" = ?', [5]);
  });

  it('only transforms fields given before unbind with select', function() {
    Article.reopen({ author: db.attr('writer') });
    return Article.objects.select(['pk']).unbind().where({ author: 5 })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('SELECT "id" FROM "articles" WHERE "author" = ?', [5]);
  });

  it('transforms fields given after update', function() {
    Article.reopen({ author: db.attr('writer') });
    return Article.objects.update({ pk: 3 }).set({ author: 2 })
    .where({ author: 5 })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('UPDATE "articles" SET "id" = ?, "writer" = ? ' +
      'WHERE "writer" = ?', [3, 2, 5]);
  });

  it('only transforms fields given before unbind with update', function() {
    Article.reopen({ author: db.attr('writer') });
    return Article.objects.update({ pk: 3 }).unbind()
    .set({ author: 2 }).where({ author: 5 })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('UPDATE "articles" SET "id" = ?, "author" = ? ' +
      'WHERE "author" = ?', [3, 2, 5]);
  });

  it('transforms fields given after insert', function() {
    Article.reopen({ author: db.attr('writer') });
    return Article.objects.insert({ pk: 3 }).values({ id: 1, author: 2 })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('INSERT INTO "articles" ("id", "writer") ' +
      'VALUES (?, ?), (?, ?)', [3, undefined, 1, 2]);
  });

  it('only transforms fields given before unbind with insert', function() {
    Article.reopen({ author: db.attr('writer') });
    return Article.objects.insert({ pk: 3 })
    .unbind().values({ id: 1, author: 2 })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('INSERT INTO "articles" ("id", "author") ' +
      'VALUES (?, ?), (?, ?)', [3, undefined, 1, 2]);
  });

  it('transforms fields given after delete', function() {
    Article.reopen({ author: db.attr('writer') });
    return Article.objects.where({ pk: 2 }).delete().where({ author: 5 })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('DELETE FROM "articles" WHERE ("id" = ?) ' +
      'AND ("writer" = ?)', [2, 5]);
  });

  it('only transforms fields given before unbind with delete', function() {
    Article.reopen({ author: db.attr('writer') });
    return Article.objects.where({ pk: 2 })
    .unbind().delete().where({ author: 5 })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('DELETE FROM "articles" WHERE ("id" = ?) ' +
      'AND ("author" = ?)', [2, 5]);
  });

  it('can get objects multiple times', function() {
    return Promise.all([Article.objects, Article.objects])
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed(
      'SELECT * FROM "articles"',
      'SELECT * FROM "articles"');
  });

  it('always gets a new query', function() {
    Article.objects.should.not.equal(Article.objects);
  });

  describe('with a custom manager', function() {
    beforeEach(function() {
      var PublishedManager = Manager.extend({
        query: function() {
          return this._super().where({ published: true });
        },
      });
      Article.reopen({ published: attr() });
      Article.reopenClass({
        published: PublishedManager.create(),
      });
    });

    it('executes custom SQL', function() {
      return Article.published.fetch()
      .should.eventually.exist
      .meanwhile(adapter).should
      .have.executed('SELECT * FROM "articles" WHERE "published" = ?', [true]);
    });
  });

  describe('with a objects replaced by a custom manager', function() {
    beforeEach(function() {
      var PublishedManager = Manager.extend({
        query: function() {
          return this._super().where({ published: true });
        },
      });
      Article.reopen({ published: attr() });
      Article.reopenClass({
        objects: PublishedManager.create(),
        allObjects: Manager.create(),
      });
    });

    it('executes custom SQL', function() {
      return Article.objects.fetch().should.eventually.exist
      .meanwhile(adapter).should
      .have.executed('SELECT * FROM "articles" WHERE "published" = ?', [true]);
    });

    it('executes standard SQL through extra manager', function() {
      return Article.allObjects.fetch()
      .should.eventually.exist
      .meanwhile(adapter).should
      .have.executed('SELECT * FROM "articles"');
    });
  });

  describe('with a custom table', function() {
    beforeEach(function() {
      Article.reopenClass({ tableName: 'article_table' });
    });
    it('knows its table', function() {
      Article.tableName.should.eql('article_table');
    });
    it('still calculates other tables names', function() {
      User.tableName.should.eql('users');
    });
    it('executes custom SQL', function() {
      return Article.objects.fetch()
      .should.eventually.exist
      .meanwhile(adapter).should
      .have.executed('SELECT * FROM "article_table"');
    });
  });

  describe('attribute storage', function() {
    it('includes undefined pk value', function() {
      var user = User.create();
      user.attrs.should.haveOwnProperty('id');
      should.equal(user.attrs.id, undefined);
    });

    it('allows override of attribute initializers', function() {
      User.reopen({
        usernameInit: function() { this.username = 'anonymous'; },
      });
      var user = User.create();
      user.attrs.username.should.equal('anonymous');
      user.dirty.should.be.false;
    });

    it('works with custom column via setters', function() {
      var user = User.create();
      user.email = 'wbyoung@azuljs.com';
      user.email.should.eql('wbyoung@azuljs.com');
      user.attrs.should.have.property('email_addr', 'wbyoung@azuljs.com');
    });

    it('works with custom column via constructor', function() {
      var user = User.create({ email: 'wbyoung@azuljs.com' });
      user.email.should.eql('wbyoung@azuljs.com');
      user.attrs.should.have.property('email_addr', 'wbyoung@azuljs.com');
    });

    it('works via setters', function() {
      var user = User.create();
      user.username = 'wbyoung';
      user.username.should.eql('wbyoung');
      user.attrs.should.have.property('username', 'wbyoung');
    });

    it('works via constructor', function() {
      var user = User.create({ username: 'wbyoung' });
      user.username.should.eql('wbyoung');
      user.attrs.should.have.property('username', 'wbyoung');
    });

    it('converts attributes to underscore case by default', function() {
      Article.reopen({ authorName: db.attr() });
      var article = Article.create({ authorName: 'Whitney' });
      article.attrs.should.have.property('author_name', 'Whitney');
    });

    it('respects given attribute name', function() {
      Article.reopen({ name: db.attr('authorName') });
      var article = Article.create({ name: 'Whitney' });
      article.attrs.should.have.property('authorName', 'Whitney');
    });

    it('can handles `false` as an attribute value', function() {
      Article.reopen({ published: db.attr() });
      var article = Article.create({ id: 5, published: false });
      article.published.should.equal(false);
    });
  });

  it('can create objects', function() {
    var article = Article.create({ title: 'Azul News' });
    return article.save().should.eventually.have.property('id', 34)
    .meanwhile(adapter).should
    .have.executed('INSERT INTO "articles" ("title") VALUES (?) '+
      'RETURNING "id"', ['Azul News']);
  });

  it('updates created objects with primary key specified', function() {
    var article = Article.create({ id: 12, title: 'Azul News' });
    return article.save().should.eventually.have.property('id', 12)
    .meanwhile(adapter).should
    .have.executed('UPDATE "articles" SET "title" = ? ' +
      'WHERE "id" = ?', ['Azul News', 12]);
  });

  it('requires attributes in order to be saved', function() {
    var Model = db.model('invalidModel', {});
    var model = Model.create({ value: 'hello' });
    return model.save().should.eventually
    .be.rejectedWith(/invalidModel has no attributes.*model.*defined/i);
  });

  it('specifies all attributes when creating objects', function() {
    var article = Article.create();
    return article.save().should.eventually.have.property('id', 34)
    .meanwhile(adapter).should
    .have.executed('INSERT INTO "articles" ("title") VALUES (?) ' +
      'RETURNING "id"', [undefined]);
  });

  it('saving gives back the original object', function() {
    var article = Article.create({ title: 'Azul News' });
    return article.save().should.eventually.equal(article);
  });

  it('can create objects with a custom pk', function() {
    Article.reopen({ pk: attr('identifier') });
    Article.reopen({ identifier: attr('identifier') });

    var article = Article.create({ title: 'Azul News' });
    return article.save().should.eventually
    .have.property('pk', 48).meanwhile(article).should
    .have.property('identifier', 48)
    .meanwhile(adapter).should
    .have.executed('INSERT INTO "articles" ("title") VALUES (?) ' +
      'RETURNING "identifier"', ['Azul News']);
  });

  it('can create objects in a transaction', function() {
    var transaction = db.query.transaction();
    var begin = transaction.begin();
    var article = Article.create({ title: 'Azul News' });
    return begin.execute()
    .then(function() { return article.save({ transaction: transaction }); })
    .then(function() { return transaction.commit(); })
    .should.eventually.exist
    .meanwhile(article).should.have.property('id', 34)
    .meanwhile(adapter).should.have.executed('BEGIN',
      'INSERT INTO "articles" ("title") ' +
      'VALUES (?) RETURNING "id"', ['Azul News'],
      'COMMIT')
    .and.have.used.oneClient;
  });

  it('can get with a custom query', function() {
    Article.reopen({ headline: db.attr() });
    return Article.objects.where({ id: 5, 'headline': 7 }).fetch()
    .should.eventually
    .eql([Article.load({ id: 1, title: 'Existing Article' })])
    .meanwhile(adapter).should
    .have.executed('SELECT * FROM "articles" WHERE "id" = ? ' +
      'AND "headline" = ?', [5, 7]);
  });

  it('can get with a custom query using falsey values', function() {
    Article.reopen({ headline: db.attr() });
    return Article.objects.where({ 'headline': 0 }).fetch()
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('SELECT * FROM "articles" WHERE "headline" = ?', [0]);
  });

  it('can get via pk', function() {
    return Article.objects.where({ pk: 5 }).fetch().should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('SELECT * FROM "articles" WHERE "id" = ?', [5]);
  });

  it('can get via pk using custom pk', function() {
    Article.reopen({ pk: attr('identifier') });
    return Article.objects.where({ pk: 5 }).fetch()
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('SELECT * FROM "articles" WHERE "identifier" = ?', [5]);
  });

  it('can get via id using custom pk', function() {
    Article.reopen({ pk: attr('identifier') });
    return Article.objects.where({ id: 5 }).fetch()
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('SELECT * FROM "articles" WHERE "identifier" = ?', [5]);
  });

  it('does not translate values qualified by table name', function() {
    Article.reopen({ pk: attr('identifier') });
    return Article.objects.where({ 'articles.pk': 5 }).fetch()
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('SELECT * FROM "articles" WHERE "articles"."pk" = ?', [5]);
  });

  it('can update objects', function() {
    var article = Article.$({ id: 5, title: 'Azul News' });
    article.title = 'Breaking Azul News';
    return article.save().should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('UPDATE "articles" SET "title" = ? WHERE "id" = ?',
      ['Breaking Azul News', 5]);
  });

  it('can update via query', function() {
    return Article.objects.update({ title: 'Breaking News' })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('UPDATE "articles" SET "title" = ?', ['Breaking News']);
  });

  it('converts fields when updating via query', function() {
    Article.reopen({ headline: attr('title') });
    return Article.objects.where({ headline: 'News' })
    .update({ headline: 'Breaking News' })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('UPDATE "articles" SET "title" = ? ' +
      'WHERE "title" = ?', ['Breaking News', 'News']);
  });

  it('converts fields specified after update on query', function() {
    Article.reopen({ headline: attr('title') });
    return Article.objects.update().where({ headline: 'News' })
    .set({ headline: 'Breaking News' })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('UPDATE "articles" SET "title" = ? ' +
      'WHERE "title" = ?', ['Breaking News', 'News']);
  });

  it('does not convert fields specified after unbind on update query', function() {
    Article.reopen({ headline: attr('title') });
    return Article.objects.update().unbind()
    .where({ headline: 'News' })
    .set({ headline: 'Breaking News' })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('UPDATE "articles" SET "headline" = ? ' +
      'WHERE "headline" = ?', ['Breaking News', 'News']);
  });

  it('can insert via query', function() {
    return Article.objects.insert({ title: 'Breaking News' })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('INSERT INTO "articles" ("title") VALUES (?)',
      ['Breaking News']);
  });

  it('converts fields when inserting via query', function() {
    Article.reopen({ headline: attr('title') });
    return Article.objects.insert({ headline: 'Breaking News' })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('INSERT INTO "articles" ("title") VALUES (?)',
      ['Breaking News']);
  });

  it('converts fields specified after initial insert', function() {
    Article.reopen({ headline: attr('title') });
    return Article.objects.insert([]).values({ headline: 'Breaking News' })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('INSERT INTO "articles" ("title") VALUES (?)',
      ['Breaking News']);
  });

  it('does not convert fields specified after unbind on insert query', function() {
    Article.reopen({ headline: attr('title') });
    return Article.objects.unbind().insert({ headline: 'Breaking News' })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('INSERT INTO "articles" ("headline") VALUES (?)',
      ['Breaking News']);
  });

  it('can delete objects', function() {
    var article = Article.$({ id: 5, title: 'Azul News' });
    article.delete();
    return article.save().should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('DELETE FROM "articles" WHERE "id" = ?', [5]);
  });

  it('can delete objects with implicit save', function() {
    var article = Article.$({ id: 5, title: 'Azul News' });
    return article.delete()
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('DELETE FROM "articles" WHERE "id" = ?', [5]);
  });

  it('can save multiple times after delete', function() {
    var article = Article.$({ id: 5, title: 'Azul News' });
    return article.delete()
    .then(function() { return article.save(); })
    .then(function() { return article.save(); })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('DELETE FROM "articles" WHERE "id" = ?', [5]);
  });

  it('can delete multiple times without causing problems', function() {
    var article = Article.$({ id: 5, title: 'Azul News' });
    return article.delete()
    .then(function() { return article.delete(); })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('DELETE FROM "articles" WHERE "id" = ?', [5]);
  });

  it('does not update objects after delete', function() {
    var article = Article.$({ id: 5, title: 'Azul News' });
    return article.delete()
    .then(function() {
      article.title = 'Changed after delete';
      return article.save();
    })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('DELETE FROM "articles" WHERE "id" = ?', [5]);
  });

  it('can delete via query', function() {
    return Article.objects.delete()
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('DELETE FROM "articles"');
  });

  it('converts fields when deleting via query', function() {
    Article.reopen({ headline: attr('title') });
    return Article.objects.where({ headline: 'News' }).delete()
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('DELETE FROM "articles" WHERE "title" = ?', ['News']);
  });

  it('converts fields specified after delete on query', function() {
    Article.reopen({ headline: attr('title') });
    return Article.objects.delete().where({ headline: 'News' })
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('DELETE FROM "articles" WHERE "title" = ?', ['News']);
  });

  it('does not convert fields specified after unbind on delete query', function() {
    Article.reopen({ headline: attr('title') });
    return Article.objects.unbind().where({ headline: 'News' }).delete()
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('DELETE FROM "articles" WHERE "headline" = ?', ['News']);
  });

  it('specifies all attributes when updating objects', function() {
    var article = Article.$({ id: 5 });
    article.id = 5; // mark as dirty
    return article.save()
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed('UPDATE "articles" SET "title" = ? WHERE "id" = ?',
      [undefined, 5]);
  });

  it('marks fetched objects as persisted', function() {
    return Article.objects.fetch().get('0')
    .should.eventually.have.property('persisted', true);
  });

  it('does not mark fetched objects as dirty', function() {
    return Article.objects.fetch().get('0')
    .should.eventually.have.property('dirty', false);
  });

  it('marks updated objects as no longer being dirty', function() {
    var article = Article.$({ id: 5, title: 'Azul News' });
    article.title = 'Breaking Azul News';
    return article.save().should.eventually.have.property('dirty', false);
  });

  it('marks saved objects as persisted', function() {
    var article = Article.create({ title: 'Azul News' });
    article.should.have.property('persisted', false);
    return article.save().should.eventually.have.property('persisted', true);
  });

  it('does not perform updates on persisted objects', function() {
    var article = Article.$({ id: 2, title: 'Azul News' });
    article.save()
    .should.eventually.exist
    .meanwhile(adapter).should
    .have.executed(/*nothing*/);
  });

  it('can force an update during save', function() {
    var article = Article.create({ title: 'Azul News' });
    return article.save({ method: 'update' })
    .should.eventually.have.property('id', undefined)
    .meanwhile(adapter).should
    .have.executed('UPDATE "articles" SET "title" = ? WHERE "id" = ?',
      ['Azul News', undefined]);
  });

  it('can force an insert during save', function() {
    var article = Article.create({ id: 12, title: 'Azul News' });
    return article.save({ method: 'insert' })
    .should.eventually.have.property('id', 34)
    .meanwhile(adapter).should
    .have.executed('INSERT INTO "articles" ("id", "title") ' +
      'VALUES (?, ?) RETURNING "id"', [12, 'Azul News']);
  });

  it('cannot save while a save is in flight', function() {
    var article = Article.create({ title: 'Azul News' });
    article.save();
    return article.save().should.eventually
    .be.rejectedWith(/Cannot save.*article.*in flight/i);
  });

}));

describe('Model#inspect', __db(function() {
  beforeEach(function() {
    db.model('article').reopen({
      title: db.attr(),
      slug: db.attr(),
      author: db.attr(),
      summary: db.attr(),
      body: db.attr(),
    });
  });

  it('works w/o pk', function() {

    var obj = db.model('article').create({
      title: 'Azul Chai',
      slug: 'azul-chai',
      author: 'Whitney Young',
      summary: 'This is the short stuff',
      body: _.repeat('This is the really long rambling output. ', 40),
    });

    util.inspect(obj, { depth: 3 }).should
      .contain('author: \'Whitney Young\'').and
      .contain('summary: [string]').and
      .contain('body: [string]').and
      .not.contain('...');

    util.inspect(obj, { depth: 2 }).should
      .contain('title: \'Azul Chai\'').and
      .contain('...').and
      .not.contain('slug').and
      .not.contain('author').and
      .not.contain('summary').and
      .not.contain('body');

    util.inspect(obj, { depth: 1 }).should
      .contain('title: \'Azul Chai\'').and
      .contain('...').and
      .not.contain('slug').and // TODO: enable
      .not.contain('author').and
      .not.contain('summary').and
      .not.contain('body');

    util.inspect(obj, { depth: 0 }).should
      .contain('title: \'Azul Chai\'').and
      .contain('...').and
      .not.contain('slug').and
      .not.contain('author').and
      .not.contain('summary').and
      .not.contain('body');

    util.inspect(obj, { depth: -1 }).should
      .contain('title: \'Azul Chai\'').and
      .contain('...').and
      .not.contain('slug').and
      .not.contain('author').and
      .not.contain('summary').and
      .not.contain('body');
  });

  it('works w/ pk', function() {

    var obj = db.model('article').create({
      id: 1,
      title: 'Azul Chai',
      slug: 'azul-chai',
      author: 'Whitney Young',
      summary: 'This is the short stuff',
      body: _.repeat('This is the really long rambling output. ', 40),
    });

    util.inspect(obj, { depth: 3 }).should
      .contain('id: 1').and
      .contain('author: \'Whitney Young\'').and
      .contain('summary: [string]').and
      .contain('body: [string]').and
      .not.contain('...');

    util.inspect(obj, { depth: 2 }).should
      .contain('id: 1').and
      .contain('title: \'Azul Chai\'').and
      .contain('...').and
      .not.contain('slug').and
      .not.contain('author').and
      .not.contain('summary').and
      .not.contain('body');

    util.inspect(obj, { depth: 1 }).should
      .contain('id: 1').and
      .contain('...').and
      .not.contain('title').and
      .not.contain('slug').and // TODO: enable
      .not.contain('author').and
      .not.contain('summary').and
      .not.contain('body');

    util.inspect(obj, { depth: 0 }).should
      .contain('id: 1').and
      .contain('...').and
      .not.contain('title').and
      .not.contain('slug').and
      .not.contain('author').and
      .not.contain('summary').and
      .not.contain('body');

    util.inspect(obj, { depth: -1 }).should
      .contain('id: 1').and
      .contain('...').and
      .not.contain('title').and
      .not.contain('slug').and
      .not.contain('author').and
      .not.contain('summary').and
      .not.contain('body');
  });

  it('works w/ pk when missing 1st attr', function() {

    var obj = db.model('article').create({
      id: 1,
      slug: 'azul-chai',
      author: 'Whitney Young',
      summary: 'This is the short stuff',
      body: _.repeat('This is the really long rambling output. ', 40),
    });

    util.inspect(obj, { depth: 2 }).should
      .contain('id: 1').and
      .contain('slug: \'azul-chai\'').and
      .not.contain('title').and
      .not.contain('author').and
      .not.contain('summary').and
      .not.contain('body');
  });

}));
