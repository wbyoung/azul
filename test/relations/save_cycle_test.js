'use strict';

require('../helpers');

describe('Model.save with many new models', __db(function() {
  /* global db, adapter */

  var wbyoung, jack, azulBlog, jacksBlog,
    article1, article2,
    commentA, commentB, commentC, commentD;

  beforeEach(require('../common').models);
  beforeEach(function() {
    var User = db.model('user');
    var Blog = db.model('blog');
    var Article = db.model('article');
    var Comment = db.model('comment');

    wbyoung = User.create({ username: 'wbyoung' });
    jack = User.create({ username: 'jack' });
    azulBlog = Blog.create({ title: 'Azul.js', owner: wbyoung });
    jacksBlog = Blog.create({ title: 'Jack\'s Adventures', owner: jack });

    article1 = Article.create({ title: '1.0 Released' });
    article1.author = wbyoung;
    commentA = Comment.create({ body: 'Correction', commenter: wbyoung });
    commentB = Comment.create({ body: 'Awesome' });
    article1.addComment(commentA);
    article1.addComment(commentB);
    azulBlog.addArticle(article1);

    article2 = azulBlog.createArticle({ title: '1.1 Released' });
    article2.author = jack;
    commentC = Comment.create({ body: 'Question' });
    commentD = Comment.create({ body: 'Great' });
    article2.addComment(commentC);
    article2.addComment(commentD);
  });

  it('saves everything "top" relation is saved', function() {
    return azulBlog.save().should.eventually.exist
    .meanwhile(adapter).should.have.executed(
      'INSERT INTO "users" ("username", "email_addr") VALUES (?, ?) ' +
      'RETURNING "id"', ['wbyoung', undefined],

      'INSERT INTO "users" ("username", "email_addr") VALUES (?, ?) ' +
      'RETURNING "id"', ['jack', undefined],

      'INSERT INTO "blogs" ("title", "owner_id") VALUES (?, ?) ' +
      'RETURNING "id"', ['Azul.js', 398],

      'INSERT INTO "articles" ("title", "blog_id", "author_identifier") ' +
      'VALUES (?, ?, ?) RETURNING "id"', ['1.0 Released', 823, 398],

      'INSERT INTO "articles" ("title", "blog_id", "author_identifier") ' +
      'VALUES (?, ?, ?) RETURNING "id"', ['1.1 Released', 823, 399],

      'INSERT INTO "comments" ("body", "article_id", "commenter_id") ' +
      'VALUES (?, ?, ?) RETURNING "id"', ['Correction', 199, 398],

      'INSERT INTO "comments" ("body", "article_id", "commenter_id") ' +
      'VALUES (?, ?, ?) RETURNING "id"', ['Awesome', 199, undefined],

      'INSERT INTO "comments" ("body", "article_id", "commenter_id") ' +
      'VALUES (?, ?, ?) RETURNING "id"', ['Question', 200, undefined],

      'INSERT INTO "comments" ("body", "article_id", "commenter_id") ' +
      'VALUES (?, ?, ?) RETURNING "id"', ['Great', 200, undefined],

      'INSERT INTO "blogs" ("title", "owner_id") VALUES (?, ?) ' +
      'RETURNING "id"', ['Jack\'s Adventures', 399]);
  });

  it('saves everything "bottom" relation is saved');

  it('saves everything "mid" relation is saved');

}));

describe('Model.save with codependent relations', __db(function() {
  /* global db, adapter */

  var jack, jill;

  beforeEach(require('../common').models);
  beforeEach(function() {
    var Person = db.model('person');

    jack = Person.create({ name: 'Jack' });
    jill = Person.create({ name: 'Jill' });
    jack.bestFriend = jill;
    jill.bestFriend = jack;
  });

  it('saves everything', function() {
    return jill.save().should.eventually.exist
    .meanwhile(adapter).should.have.executed(
      'INSERT INTO "people" ("name", "best_friend_id") ' +
      'VALUES (?, ?) RETURNING "id"', ['Jack', undefined],

      'INSERT INTO "people" ("name", "best_friend_id") ' +
      'VALUES (?, ?) RETURNING "id"', ['Jill', 102],

      'UPDATE "people" SET "best_friend_id" = ? ' +
      'WHERE "id" = ?', [103, 102])
    .meanwhile(jack).should.be.a.model('person')
    .with.json({ id: 102, name: 'Jack', bestFriendId: 103 })
    .and.to.have.property('dirty', false)
    .meanwhile(jill).should.be.a.model('person')
    .with.json({ id: 103, name: 'Jill', bestFriendId: 102 })
    .and.to.have.property('dirty', false);
  });

}));

describe('Model.save with circular many-to-many', __db(function() {
  /* global db, adapter */

  var jack, jill;

  beforeEach(require('../common').models);
  beforeEach(function() {
    var Person = db.model('individual');

    jill = Person.create({ name: 'Jill' });
    jack = Person.create({ name: 'Jack' });
    jill = Person.create({ name: 'Jill' });
    jack.addFollower(jill);
    jill.addFollower(jack);
  });

  it('saves everything', function() {
    return jill.save().should.eventually.exist
    .meanwhile(adapter).should.have.executed(
      'INSERT INTO "individuals" ("name") ' +
      'VALUES (?) RETURNING "id"', ['Jill'],

      'INSERT INTO "individuals" ("name") ' +
      'VALUES (?) RETURNING "id"', ['Jack'],

      'INSERT INTO "relationships" ("followed_id", "follower_id") ' +
      'VALUES (?, ?)', [102, 103],

      'INSERT INTO "relationships" ("followed_id", "follower_id") ' +
      'VALUES (?, ?)', [103, 102])
    .meanwhile(jill).should.be.a.model('individual')
    .with.json({ id: 102, name: 'Jill' })
    .meanwhile(jack).should.be.a.model('individual')
    .with.json({ id: 103, name: 'Jack' });
  });

}));
