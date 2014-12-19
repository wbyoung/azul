'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var FakeAdapter = require('../fakes/adapter');

require('../helpers/model');

var db,
  adapter,
  Site,
  user,
  User,
  blog,
  Blog,
  Article,
  Comment;

describe('Model.hasMany :through-shortcut', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });

    var hasMany = db.hasMany;
    var attr = db.attr;

    Site = db.model('site').reopen({
      name: attr(),
      users: hasMany(),
      blogs: hasMany({ through: 'users' }),
      articles: hasMany({ through: 'blogs' }),
      comments: hasMany({ through: 'articles' })
    });
    User = db.model('user').reopen({
      username: attr(),
      blogs: hasMany({ inverse: 'owner' }),
      articles: hasMany({ through: 'blogs' }),
      comments: hasMany({ through: 'articles' })
    });
    Blog = db.model('blog').reopen({
      title: attr(),
      articles: hasMany(),
      comments: hasMany({ through: 'articles' })
    });
    Article = db.model('article').reopen({
      title: attr(),
      comments: hasMany()
    });
    Comment = db.model('comment').reopen({
      body: attr(),
    });
  });

  beforeEach(function() {
    adapter.intercept(/select.*from "users"/i, {
      fields: ['id', 'username'],
      rows: [{ id: 4, username: 'wbyoung' }]
    });
    adapter.intercept(/select.*from "blogs"/i, {
      fields: ['id', 'title'],
      rows: [{ id: 12, title: 'Azul Blog', 'owner_id': 4 }]
    });
    adapter.intercept(/select.*from "articles"/i, {
      fields: ['id', 'title', 'author_id'],
      rows: [{ id: 9, title: 'Journal', 'blog_id': 12 }]
    });
    adapter.intercept(/select.*from "comments"/i, {
      fields: ['id', 'body', 'article_id'],
      rows: [
        { id: 1, body: 'Great post.', 'article_id': 9 },
        { id: 2, body: 'Nicely worded.', 'article_id': 9 },
      ]
    });
  });

  beforeEach(function() {
    user = User.fresh({ id: 4, username: 'wbyoung' });
    blog = Blog.fresh({ id: 12, title: 'Azul Blog' });
  });

  it('has related methods', function() {
    expect(User.__class__.prototype).to.have.ownProperty('comments');
    expect(user).to.have.property('commentObjects');
    expect(user).to.respondTo('createComment');
    expect(user).to.respondTo('createComment');
    expect(user).to.respondTo('addComment');
    expect(user).to.respondTo('addComments');
    expect(user).to.respondTo('removeComment');
    expect(user).to.respondTo('removeComments');
    expect(user).to.respondTo('clearComments');
  });

  describe('relation', function() {

    it('fetches through one relationship', function(done) {
      blog.commentObjects.fetch().then(function(comments) {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "comments".* FROM "comments" ' +
           'INNER JOIN "articles" ' +
           'ON "comments"."article_id" = "articles"."id" ' +
           'WHERE "articles"."blog_id" = ?', [12]]
        ]);
        expect(_.map(comments, 'attrs')).to.eql([
          { id: 1, body: 'Great post.', 'article_id': 9 },
          { id: 2, body: 'Nicely worded.', 'article_id': 9 },
        ]);
      })
      .done(done, done);
    });

    it.skip('does not allow creating objects', function() {

    });

    it.skip('does not allow adding objects', function() {

    });

    it.skip('does not allow removing objects', function() {

    });

    it.skip('does not allow clearing objects', function() {

    });

    it.skip('does not do anything special on save', function() {

    });

    it('fetches through two relationships', function(done) {
      user.commentObjects.fetch().then(function(comments) {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "comments".* FROM "comments" ' +
           'INNER JOIN "articles" ' +
           'ON "comments"."article_id" = "articles"."id" ' +
           'INNER JOIN "blogs" ' +
           'ON "articles"."blog_id" = "blogs"."id" ' +
           'WHERE "blogs"."owner_id" = ?', [4]]
        ]);
        expect(_.map(comments, 'attrs')).to.eql([
          { id: 1, body: 'Great post.', 'article_id': 9 },
          { id: 2, body: 'Nicely worded.', 'article_id': 9 },
        ]);
      })
      .done(done, done);
    });

    it('fetches through many relationships', function(done) {
      db = Database.create({ adapter: adapter });
      Site = db.model('site').reopen({
        authors: db.hasMany(),
        posts: db.hasMany({ through: 'authors' }),
        comments: db.hasMany({ through: 'posts' }),
        commenters: db.hasMany({ through: 'comments' }),
      });
      db.model('author').reopen({
        posts: db.hasMany(),
        comments: db.hasMany({ through: 'posts' }),
        commenters: db.hasMany({ through: 'comments' }),
      });
      db.model('post').reopen({
        comments: db.hasMany(),
        commenters: db.hasMany({ through: 'comments' })
      });
      db.model('comment').reopen({
        commenter: db.belongsTo()
      });
      db.model('commenter');
      var site = Site.fresh({ id: 1 });

      site.commenterObjects.fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "commenters".* FROM "commenters" ' +
           'INNER JOIN "comments" ' +
           'ON "comments"."commenter_id" = "commenters"."id" ' +
           'INNER JOIN "posts" ' +
           'ON "comments"."post_id" = "posts"."id" ' +
           'INNER JOIN "authors" ' +
           'ON "posts"."author_id" = "authors"."id" ' +
           'WHERE "authors"."site_id" = ?', [1]]
        ]);
      })
      .done(done, done);
    });

    it('throws an error when it cannot find a through relation', function() {
      db = Database.create({ adapter: adapter });
      Site = db.model('site').reopen({
        posts: db.hasMany({ through: 'authors', autoJoin: false }),
        comments: db.hasMany({ through: 'posts' }),
      });
      var site = Site.fresh({ id: 6 });
      expect(function() {
        site.commentObjects.fetch();
      }).to.throw(/through.*authors.*site#posts.*has-many/i);
    });

    it('fetches through many relationships', function(done) {
      db = Database.create({ adapter: adapter });
      Site = db.model('site').reopen({
        authors: db.hasMany(),
        commenters: db.hasMany({ through: 'authors' }),
      });
      db.model('author').reopen({
        posts: db.hasMany(),
        commenters: db.hasMany({ through: 'posts' }),
      });
      db.model('post').reopen({
        comments: db.hasMany(),
        commenters: db.hasMany({ through: 'comments' })
      });
      db.model('comment').reopen({
        commenter: db.belongsTo()
      });
      db.model('commenter');
      var site = Site.fresh({ id: 1 });

      site.commenterObjects.fetch().then(function() {
        expect(adapter.executedSQL()).to.eql([
          ['SELECT "commenters".* FROM "commenters" ' +
           'INNER JOIN "comments" ' +
           'ON "comments"."commenter_id" = "commenters"."id" ' +
           'INNER JOIN "posts" ' +
           'ON "comments"."post_id" = "posts"."id" ' +
           'INNER JOIN "authors" ' +
           'ON "posts"."author_id" = "authors"."id" ' +
           'WHERE "authors"."site_id" = ?', [1]]
        ]);
      })
      .done(done, done);
    });

  });
});
