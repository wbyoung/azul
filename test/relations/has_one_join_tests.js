'use strict';

require('../helpers');

var User;

describe('Model.hasOne joins', __db(function() {
  /* global db, adapter */

  beforeEach(require('../common').models);
  beforeEach(function() {
    User = db.model('user');
  });

  it('generates simple join queries', function() {
    return User.objects.join('blog').fetch().should.eventually.exist.meanwhile(adapter)
    .should.have.executed('SELECT "users".* FROM "users" ' +
      'INNER JOIN "blogs" ON "blogs"."owner_id" = "users"."id"');
  });

  it('generates join queries that use where accessing fields in both types', function() {
    return User.objects.join('blog').where({
      username: 'wbyoung',
      title$contains: 'Azul',
    })
    .fetch().should.eventually.exist.meanwhile(adapter)
    .should.have.executed(
      'SELECT "users".* FROM "users" ' +
      'INNER JOIN "blogs" ON "blogs"."owner_id" = "users"."id" ' +
      'WHERE "users"."username" = ? ' +
      'AND "blogs"."title" LIKE ?', ['wbyoung', '%Azul%']);
  });

  it('defaults to the main model on ambiguous property', function() {
    return User.objects.join('blog').where({ id: 5 })
    .fetch().should.eventually.exist.meanwhile(adapter)
    .should.have.executed(
      'SELECT "users".* FROM "users" ' +
      'INNER JOIN "blogs" ON "blogs"."owner_id" = "users"."id" ' +
      'WHERE "users"."id" = ?', [5]);
  });

  it('gives an error when there is an ambiguous property in two joins', function() {
    db.model('profile', { title: db.attr() });
    User.reopen({ profile: db.hasOne() });

    expect(function() {
      User.objects
        .join('blog')
        .join('profile')
        .where({ title: 'Profile/Blog Title' });
    }).to.throw(/ambiguous.*"title".*"(blog|profile)".*"(blog|profile)"/i);
  });

  it('resolves fields specified by relation name', function() {
    return User.objects.join('blog').where({ 'blog.id': 5, })
    .fetch().should.eventually.exist.meanwhile(adapter)
    .should.have.executed(
      'SELECT "users".* FROM "users" ' +
      'INNER JOIN "blogs" ON "blogs"."owner_id" = "users"."id" ' +
      'WHERE "blogs"."id" = ?', [5]);
  });

  it('resolves fields specified by relation name & attr name', function() {
    return User.objects.join('blog').where({ 'blog.pk': 5, })
    .fetch().should.eventually.exist.meanwhile(adapter)
    .should.have.executed(
      'SELECT "users".* FROM "users" ' +
      'INNER JOIN "blogs" ON "blogs"."owner_id" = "users"."id" ' +
      'WHERE "blogs"."id" = ?', [5]);
  });

  it('automatically determines joins from conditions', function() {
    return User.objects.where({ 'blog.title': 'News', })
    .fetch().should.eventually.exist.meanwhile(adapter)
    .should.have.executed(
      'SELECT "users".* FROM "users" ' +
      'INNER JOIN "blogs" ON "blogs"."owner_id" = "users"."id" ' +
      'WHERE "blogs"."title" = ? ' +
      'GROUP BY "users"."id"', ['News']);
  });

  it('automatically determines joins from order by', function() {
    return User.objects.orderBy('-blog.pk')
    .fetch().should.eventually.exist.meanwhile(adapter)
    .should.have.executed(
      'SELECT "users".* FROM "users" ' +
      'INNER JOIN "blogs" ON "blogs"."owner_id" = "users"."id" ' +
      'GROUP BY "users"."id" ' +
      'ORDER BY "blogs"."id" DESC');
  });

  it('handles attrs during automatic joining', function() {
    return User.objects.where({ 'blog.pk': 5, })
    .fetch().should.eventually.exist.meanwhile(adapter)
    .should.have.executed(
      'SELECT "users".* FROM "users" ' +
      'INNER JOIN "blogs" ON "blogs"."owner_id" = "users"."id" ' +
      'WHERE "blogs"."id" = ? ' +
      'GROUP BY "users"."id"', [5]);
  });

  it('does not automatically join based on attributes', function() {
    return User.objects.where({ 'username': 'wbyoung', })
    .fetch().should.eventually.exist.meanwhile(adapter)
    .should.have.executed(
      'SELECT * FROM "users" ' +
      'WHERE "username" = ?', ['wbyoung']);
  });

  it('works with a complex query', function() {
    return User.objects.where({ 'blog.title$contains': 'news', })
    .orderBy('username', '-blog.title')
    .limit(10)
    .offset(20)
    .fetch().should.eventually.exist.meanwhile(adapter)
    .should.have.executed(
      'SELECT "users".* FROM "users" ' +
      'INNER JOIN "blogs" ON "blogs"."owner_id" = "users"."id" ' +
      'WHERE "blogs"."title" LIKE ? ' +
      'GROUP BY "users"."id" ' +
      'ORDER BY "users"."username" ASC, "blogs"."title" DESC ' +
      'LIMIT 10 OFFSET 20', ['%news%']);
  });

  it('joins & orders across multiple relationships', function() {
    return User.objects.where({ 'blog.articles.title$contains': 'rolex', })
    .orderBy('username', 'blog.articles.title')
    .limit(10)
    .offset(20)
    .fetch().should.eventually.exist.meanwhile(adapter)
    .should.have.executed(
      'SELECT "users".* FROM "users" ' +
      'INNER JOIN "blogs" ON "blogs"."owner_id" = "users"."id" ' +
      'INNER JOIN "articles" ON "articles"."blog_id" = "blogs"."id" ' +
      'WHERE "articles"."title" LIKE ? ' +
      'GROUP BY "users"."id" ' +
      'ORDER BY "users"."username" ASC, "articles"."title" ASC ' +
      'LIMIT 10 OFFSET 20', ['%rolex%']);
  });

  it('gives a useful error when second bad relation is used for `join`', function() {
    expect(function() {
      User.objects.join('blog.streets');
    }).to.throw(/no relation.*"streets".*join.*user query.*blog/i);
  });

}));
