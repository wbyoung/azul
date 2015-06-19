'use strict';

require('../helpers');

var user;
var User;
var Blog;

describe('Model.hasOne', __db(function() {
  /* global db, adapter */

  beforeEach(require('../common').models);
  beforeEach(function() {
    Blog = db.model('blog');
    User = db.model('user');
    user = User.$({ id: 231 });
  });

  describe('definition', function() {
    it('does not need to provide name', function() {
      user.blogRelation._relatedModel.should.equal(Blog);
    });

    it('calculates foreign key from inverse', function() {
      User.reopen({ profile: db.hasOne({ inverse: 'stats' }) });
      user.profileRelation.foreignKey.should.eql('statsId');
      user.profileRelation.foreignKeyAttr.should.eql('stats_id');
    });

    it('uses the primary key as the join key', function() {
      user.blogRelation.joinKey.should.eql(user.blogRelation.primaryKey);
    });

    it('uses the foreign key as the inverse key', function() {
      user.blogRelation.inverseKey.should.eql(user.blogRelation.foreignKey);
    });

    it('can generate an inverse relation', function() {
      User.reopen({ profile: db.hasOne({ inverse: 'stats' }) });
      var profileRelation = User.__class__.prototype.profileRelation;
      var inverse = profileRelation.inverseRelation();
      inverse.joinKey.should.eql('statsId');
      inverse.joinKeyAttr.should.eql('stats_id');
      inverse.inverseKey.should.eql('pk');
      inverse.inverseKeyAttr.should.eql('id');
    });
  });

  it('has related methods', function() {
    User.__class__.prototype.should.have.ownProperty('blog');
    user.should.respondTo('createBlog');
    user.should.respondTo('fetchBlog');
    user.should.respondTo('setBlog');
    user.should.not.have.property('blogObjects');
  });

  describe('relation', function() {

    it('fetches related object', function() {
      return user.fetchBlog().should.eventually.be.a.model('blog')
      .with.json({ id: 348, title: 'Azul.js', ownerId: 231 })
      .meanwhile(adapter).should.have
      .executed('SELECT * FROM "blogs" WHERE "owner_id" = ? LIMIT 1', [231]);
    });

    it('fetches related objects when the result set is empty', function() {
      adapter.respond(/select.*from "blogs"/i, []);
      return user.fetchBlog().should.eventually.eql(undefined);
    });

    it('throws when attempting to access un-loaded collection', function() {
      expect(function() {
        user.blog;
      }).to.throw(/blog.*not yet.*loaded/i);
    });

    it('allows access loaded item', function() {
      return user.fetchBlog().should.eventually.exist
      .meanwhile(user).should.have.property('blog').that.is.a.model('blog')
      .with.json({ id: 348, title: 'Azul.js', ownerId: 231 });
    });

    it('does not load collection cache during model load', function() {
      return User.objects.limit(1).fetchOne()
      .get('blog').should.eventually
      .be.rejectedWith(/blog.*not yet.*loaded/i);
    });

    it('allows access loaded collection when the result set is empty', function() {
      adapter.respond(/select.*from "blogs"/i, []);
      return user.fetchBlog().should.eventually.be.fulfilled
      .meanwhile(user).should.have.property('blog', undefined);
    });
  });

  describe('helpers', function() {
    it('allows create', function() {
      var blog = user.createBlog({ title: 'Hello' });
      blog.ownerId.should.eql(user.id);
      blog.should.be.an.instanceOf(Blog.__class__);
      user.should.have.property('blog').that.equals(blog);
    });

    it('allows created object to be saved', function() {
      return user.createBlog({ title: 'Hello' }).save()
      .should.eventually.exist
      .meanwhile(adapter).should.have.executed(
        'INSERT INTO "blogs" ("title", "owner_id") VALUES (?, ?) ' +
        'RETURNING "id"', ['Hello', 231]);
    });

    it('allows store with existing object', function() {
      user.blog = Blog.$({ id: 3, title: 'Blog' });
      return user.save().should.eventually.exist
      .meanwhile(adapter).should.have.executed('UPDATE "blogs" ' +
        'SET "owner_id" = ? WHERE "id" = ?', [231, 3]);
    });

    it('allows save to clear relationship', function() {
      return user.fetchBlog().then(function() {
        user.blog = null;
        return user.save();
      })
      .should.eventually.exist
      .meanwhile(adapter).should.have.executed(/select/i, [231],
        'UPDATE "blogs" SET "owner_id" = ? ' +
        'WHERE "id" = ?', [undefined, 348]);
    });

    it('allows store with unsaved object', function() {
      user.blog = Blog.create({ title: 'Blog' });
      return user.save().should.eventually.exist
      .meanwhile(adapter).should.have.executed(
        'INSERT INTO "blogs" ("title", "owner_id") VALUES (?, ?) ' +
        'RETURNING "id"', ['Blog', 231]);
    });

    it('allows store via constructor', function() {
      var blog = Blog.create({ title: 'Blog' });
      var user = User.create({ username: 'jack', blog: blog });
      return user.save().should.eventually.exist
      .meanwhile(adapter).should.have.executed(
        'INSERT INTO "users" ("username", "email_addr") VALUES (?, ?) ' +
        'RETURNING "id"', ['jack', undefined],
        'INSERT INTO "blogs" ("title", "owner_id") VALUES (?, ?) ' +
        'RETURNING "id"', ['Blog', 398]);
    });

    it('does not try to repeat setting relation', function() {
      var blog = Blog.$({ id: 5, title: 'Hello' });
      user.blog = blog;
      return user.save().then(function() {
        return user.save();
      })
      .should.eventually.exist
      .meanwhile(adapter).should.have.executed(
        'UPDATE "blogs" SET "owner_id" = ? WHERE "id" = ?', [231, 5])
      .then(function() {
        expect(user).to.have.property('_blogObjectsInFlight')
          .that.is.undefined;
        blog.should.have.property('dirty', false);
      });
    });

    it('does not try to repeat clearing relation', function() {
      var removed;
      return user.fetchBlog().then(function() {
        removed = user.blog;
        user.blog = null;
      })
      .then(function() { return user.save(); })
      .should.eventually.exist
      .meanwhile(adapter).should.have.executed(
        'SELECT * FROM \"blogs\" WHERE \"owner_id\" = ? LIMIT 1', [231],
        'UPDATE "blogs" SET "owner_id" = ? WHERE "id" = ?', [undefined, 348])
      .then(function() {
        expect(user).to.have.property('_articlesObjectsInFlight')
          .that.is.undefined;
        removed.should.have.property('dirty', false);
      });
    });
  });
}));
