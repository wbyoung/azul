'use strict';

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
  article,
  articleObjects;

var createdArticle;
var createdAuthor;
var removedAuthor;
var storedAuthor;
var storePromise;
var shared = {};

shared.storeExistingAuthor = function() {
  storedAuthor = user;
  article.author = storedAuthor;
  storePromise = article.save();
};

// TODO: in the only current use case for this, the user already has loaded the
// articles. that means that we could simply access one of those loaded
// articles & clear the author on that instead.
shared.clearExistingAuthor = function() {
  removedAuthor = user;
  // use relation method to make it seem like this was loaded with the user
  article.authorRelation.associate(article, user);
  expect(removedAuthor.articles).to.contain(article);
  article.author = null;
  storePromise = article.save();
};

shared.storeCreatedAuthor = function() {
  storedAuthor = User.create({ username: 'jack' });
  article.author = storedAuthor;
  storePromise = article.save();
};

shared.storeUnsavedAuthor = function() {
  storedAuthor = user;
  user.username = user.username + '_updated';
  article.author = storedAuthor;
  storePromise = article.save();

  // TODO: what happens when there is an error during the save? do in flight
  // values get reverted? do they get re-tried the next time around? consider
  // the following attributes when thinking about this:
  //   - article.author
  //   - article.authorId
  //   - article.attrs.author_id
  //   - storedAuthor.articles << article
};

describe('Model.hasMany+belongsTo', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });

    var hasMany = db.hasMany;
    var belongsTo = db.belongsTo;
    var attr = db.attr;

    Article = db.model('article').reopen({
      title: attr(),
      author: belongsTo('user')
    });
    User = db.model('user').reopen({
      username: attr(),
      articles: hasMany('article', { inverse: 'author' })
    });
  });

  beforeEach(function() {
    user = User.fresh({ id: 395, username: 'miles' });
    article = Article.fresh({ id: 828, title: 'Dog Psychology' });
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
    adapter.intercept(/insert into "users"/i, {
      fields: ['id'],
      rows: [{ id: 43 }]
    });
  });

  describe('when creating via belongsTo', function() {

    beforeEach(function() {
      createdAuthor = article.createAuthor({ username: 'phil' });
    });

    it('creates hasMany collection cache', function() {
      expect(createdAuthor.articles).to.eql([article]);
    });
  });

  describe('when creating via hasMany', function() {
    beforeEach(function() {
      createdArticle = user.createArticle({ title: 'Hello' });
    });

    it('creates an object of the correct type', function() {
      expect(createdArticle).to.to.be.an.instanceOf(Article.__class__);
    });

    it('sets inverse/belongsTo attribute', function() {
      expect(createdArticle.author).to.equal(user);
    });

  });

  describe('when adding existing object via hasMany', function() {
    var promise;
    beforeEach(function() { promise = user.addArticle(article); });

    it('sets foreign key', function() {
      expect(article.authorId).to.eql(user.id);
    });

    it('sets related object', function() {
      expect(article.author).to.equal(user);
    });

    describe('when executed', function() {
      beforeEach(function(done) {
        promise.then(function() { done(); }, done);
      });

      it.skip('invalidates the hasMany collection cache');

      it('executes the proper sql', function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_id" = ? WHERE "id" = ?', [395, 828]]
        ]);
      });
    });
  });

  describe('when removing existing object via hasMany', function() {
    var promise;
    beforeEach(function() {
      article.author = user;
      promise = user.removeArticle(article);
    });

    it('clears foreign key', function() {
      expect(article.authorId).to.not.exist;
    });

    it('clears related object', function() {
      expect(article.author).to.not.exist;
    });

    describe('when executed', function() {
      beforeEach(function(done) {
        promise.then(function() { done(); }, done);
      });

      it.skip('invalidates the hasMany collection cache');

      it('executes the proper sql', function() {
        expect(adapter.executedSQL()).to.eql([
          ['UPDATE "articles" SET "author_id" = ? ' +
           'WHERE "id" = ?', [undefined, 828]]
        ]);
      });
    });
  });

  describe('when hasMany collection cache is loaded', function() {
    beforeEach(function(done) {
      user.articleObjects.fetch().then(function() { done(); }, done);
    });

    describe('when storing existing object via belongsTo', function() {
      beforeEach(shared.storeExistingAuthor);

      it('adds to hasMany collection cache', function() {
        expect(storedAuthor.articles).to.contain(article);
      });

      describe('when executed', function() {
        beforeEach(function(done) {
          storePromise.then(function() { done(); }, done);
        });

        it('executes the proper sql', function() {
          expect(adapter.executedSQL()).to.eql([
            // included from the fetch when loading the cache
            ['SELECT * FROM "articles" WHERE "author_id" = ?', [395]],
            // note that this expectation depends on ordering of object
            // properties which is not guaranteed to be a stable ordering.
            ['UPDATE "articles" SET "title" = ?, "author_id" = ? ' +
             'WHERE "id" = ?', ['Dog Psychology', 395, 828]]
          ]);
        });
      });
    });

    describe('when removing existing object via belongsTo', function() {
      beforeEach(shared.clearExistingAuthor);

      it('removes from hasMany collection cache', function() {
        expect(removedAuthor.articles).to.not.contain(article);
      });
    });
  });

  describe('when storing existing object via belongsTo', function() {
    beforeEach(shared.storeExistingAuthor);

    it('does not load hasMany collection cache', function() {
      expect(function() {
        storedAuthor.articles;
      }).to.throw(/articles.*not yet.*loaded/i);
    });

    describe('when executed', function() {
      beforeEach(function(done) {
        storePromise.then(function() { done(); }, done);
      });

      it('executes the proper sql', function() {
        expect(adapter.executedSQL()).to.eql([
          // note that this expectation depends on ordering of object
          // properties which is not guaranteed to be a stable ordering.
          ['UPDATE "articles" SET "title" = ?, "author_id" = ? ' +
           'WHERE "id" = ?', ['Dog Psychology', 395, 828]]
        ]);
      });
    });
  });

  describe('when storing created object via belongsTo', function() {
    beforeEach(shared.storeCreatedAuthor);

    it('adds to hasMany collection cache', function() {
      expect(storedAuthor.articles).to.contain(article);
    });


    describe('when executed', function() {
      beforeEach(function(done) {
        storePromise.then(function() { done(); }, done);
      });
    });
  });

  describe('when storing unsaved object via belongsTo', function() {
    beforeEach(shared.storeUnsavedAuthor);

    it('does not load hasMany collection cache', function() {
      expect(function() {
        storedAuthor.articles;
      }).to.throw(/articles.*not yet.*loaded/i);
    });


    describe('when executed', function() {
      beforeEach(function(done) {
        storePromise.then(function() { done(); }, done);
      });
    });
  });
});
