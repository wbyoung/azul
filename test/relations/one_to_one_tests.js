'use strict';

require('../helpers');

var _ = require('lodash');

var user;
var User;
var blog;
var Blog;

describe('Model one-to-one', __db(function() {
  /* global db, adapter */

  beforeEach(require('../common').models);
  beforeEach(function() {
    Blog = db.model('blog');
    User = db.model('user');
    user = User.$({ id: 231 });
    blog = Blog.$({ id: 348 });
  });

  describe('belongsTo with hasOne associations disabled', function() {
    beforeEach(function() {
      sinon.spy(blog, 'setAttribute');
      sinon.stub(user.blogRelation, 'associate');
      sinon.stub(user.blogRelation, 'disassociate');
    });

    it('sets the foreign key before the inverse when associating', function() {
      blog.ownerRelation.associate(blog, user);
      var attrSpy = blog.setAttribute;
      var associateSpy = user.blogRelation.associate;
      attrSpy.should.have.been.calledOnce;
      associateSpy.should.have.been.calledOnce;
      attrSpy.should.have.been.calledBefore(associateSpy);
    });

    it('sets the foreign key before the inverse when disassociating', function() {
      blog.ownerRelation.disassociate(blog, user);
      var attrSpy = blog.setAttribute;
      var disassociateSpy = user.blogRelation.disassociate;
      attrSpy.should.have.been.calledOnce;
      disassociateSpy.should.have.been.calledOnce;
      attrSpy.should.have.been.calledBefore(disassociateSpy);
    });
  });

  describe('hasOne with belongsTo associations disabled', function() {
    beforeEach(function() {
      sinon.spy(blog, 'setAttribute');
      sinon.stub(blog.ownerRelation, 'associate');
      sinon.stub(blog.ownerRelation, 'disassociate');
    });

    it('sets the foreign key before the inverse when associating', function() {
      user.blogRelation.associate(user, blog);
      var attrSpy = blog.setAttribute;
      var associateSpy = blog.ownerRelation.associate;
      attrSpy.should.have.been.calledOnce;
      associateSpy.should.have.been.calledOnce;
      attrSpy.should.have.been.calledBefore(associateSpy);
    });

    it('sets the foreign key before the inverse when disassociating', function() {
      user.blogRelation.disassociate(user, blog);
      var attrSpy = blog.setAttribute;
      var disassociateSpy = blog.ownerRelation.disassociate;
      attrSpy.should.have.been.calledOnce;
      disassociateSpy.should.have.been.calledOnce;
      attrSpy.should.have.been.calledBefore(disassociateSpy);
    });
  });

  describe('when creating via belongsTo', function() {

    beforeEach(function() {
      user = blog.createOwner({ username: 'phil' });
    });

    it('creates hasOne item cache', function() {
      user.blog.should.eql(blog);
    });
  });

  describe('when creating via hasOne', function() {
    beforeEach(function() {
      blog = user.createBlog({ title: 'Hello' });
    });

    it('creates an object of the correct type', function() {
      blog.should.be.an.instanceOf(Blog.__class__);
    });

    it('sets inverse/belongsTo attribute', function() {
      blog.owner.should.equal(user);
    });

  });

  describe('when setting existing object via hasOne', function() {
    beforeEach(function() {
      user.setBlog(blog);
    });

    it('sets foreign key', function() {
      blog.ownerId.should.eql(user.id);
    });

    it('sets related object', function() {
      blog.owner.should.equal(user);
    });

    describe('when executed', function() {
      beforeEach(function() {
        return user.save();
      });

      it('executes the proper sql', function() {
        adapter.should.have.executed('UPDATE "blogs" SET "owner_id" = ? ' +
          'WHERE "id" = ?', [231, 348]);
      });
    });
  });

  describe('when removing fetched object via hasOne', function() {
    beforeEach(function() {
      return user.fetchBlog().then(function(obj) { blog = obj; });
    });
    beforeEach(function() { user.setBlog(null); });

    it('clears foreign key', function() {
      expect(blog.ownerId).to.not.exist;
    });

    it('clears related object', function() {
      expect(blog.owner).to.not.exist;
    });

    describe('when executed', function() {
      beforeEach(function() { adapter.scope(); });
      beforeEach(function() { return user.save(); });
      afterEach(function() { adapter.unscope(); });

      it('executes the proper sql', function() {
        adapter.should.have.executed('UPDATE "blogs" SET "owner_id" = ? ' +
          'WHERE "id" = ?', [undefined, 348]);
      });
    });
  });

  describe('when a hasOne relationship is pre-fetched', function() {
    var users;

    beforeEach(function() {
      return User.objects.with('blog').fetch().then(function(result) {
        users = result;
      });
    });

    it('caches the relevant belongsTo objects', function() {
      var user = users[0];
      user.blog.owner.should.equal(user);
    });
  });

  describe('when hasOne item cache is loaded', function() {
    beforeEach(function() { return user.fetchBlog(); });

    it('caches the relevant belongsTo objects', function() {
      user.blog.should.exist;
      user.blog.owner.should.equal(user);
    });

    describe('when storing existing object via belongsTo', function() {
      beforeEach(function() { adapter.scope(); });
      beforeEach(function() { blog.owner = user; });
      afterEach(function() { adapter.unscope(); });

      it('sets hasOne item', function() {
        user.blog.should.exist.and.have.properties({ id: 348, ownerId: 231 });
      });

      describe('when executed', function() {
        beforeEach(function() {
          return blog.save();
        });

        it('executes the proper sql', function() {
          adapter.should.have.executed('UPDATE "blogs" ' +
            'SET "title" = ?, "owner_id" = ? ' +
            'WHERE "id" = ?', [undefined, 231, 348]);
        });
      });
    });

    describe('when removing existing object via belongsTo', function() {
      beforeEach(function() {
        blog = user.blog;
        blog.owner = null;
      });

      it('removes from hasOne item cache', function() {
        expect(user.blog).to.not.exist;
      });
    });

    describe('when changing existing object to new object via belongsTo', function() {
      var newOwner;

      beforeEach(function() {
        newOwner = User.create({ username: 'reed' });
        blog = user.blog;
        blog.owner = newOwner;
      });

      it('removes from hasOne item cache', function() {
        expect(user.blog).to.not.exist;
      });

      it('adds to hasOne item cache', function() {
        newOwner.blog.should.eql(blog);
      });
    });

    describe('json', function() {

      it('does not include relations', function() {
        user.json.should.eql({
          id: 231,
          email: undefined,
          username: undefined,
        });
        blog.json.should.eql({
          id: 348,
          ownerId: undefined,
          title: undefined,
        });
      });

      it('can be extended to include relations', function() {
        User.reopen({
          toJSON: function() {
            return _.extend(this._super(), {
              blog: _.result(this.blog, 'toNestable'),
            });
          },
        });
        Blog.reopen({
          toNestable: function() {
            return _.omit(this.toObject(), 'ownerId');
          },
          toJSON: function() {
            return _.extend(this.toNestable(), {
              owner: _.result(this.owner, 'toObject'),
            });
          },
        });

        user.json.should.eql({
          id: 231,
          email: undefined,
          username: undefined,
          blog: { id: 348, title: 'Azul.js' },
        });

        user.blog.json.should.eql({
          id: 348,
          title: 'Azul.js',
          owner: { id: 231, email: undefined, username: undefined },
        });

      });
    });
  });

  describe('when storing existing object via belongsTo', function() {
    beforeEach(function() { blog.owner = user; });

    it('creates the hasOne item cache', function() {
      expect(function() {
        user.blog;
      }).to.not.throw();
    });

    describe('when executed', function() {
      beforeEach(function() { return blog.save(); });

      it('executes the proper sql', function() {
        adapter.should.have.executed(
          'UPDATE "blogs" SET "title" = ?, "owner_id" = ? ' +
          'WHERE "id" = ?', [undefined, 231, 348]);
      });
    });
  });

  describe('when storing created object via belongsTo', function() {
    beforeEach(function() {
      user = User.create({ username: 'jack' });
      blog.owner = user;
    });

    it('adds to hasOne item cache', function() {
      user.blog.should.eql(blog);
    });

    describe('when executed', function() {
      beforeEach(function() { return blog.save(); });

      it('executes the proper sql', function() {
        adapter.should.have.executed(
          'INSERT INTO "users" ("username", "email_addr") ' +
          'VALUES (?, ?) RETURNING "id"', ['jack', undefined],
          'UPDATE "blogs" SET "title" = ?, "owner_id" = ? ' +
          'WHERE "id" = ?', [undefined, 398, 348]);
      });
    });
  });

  describe('when storing unsaved object via belongsTo', function() {
    beforeEach(function() {
      user.username = 'jack';
      blog.owner = user;
    });

    it('loads the hasOne item cache', function() {
      expect(function() { user.blog; }).to.not.throw();
    });

    describe('when executed', function() {
      beforeEach(function() { return blog.save(); });

      it('executes the proper sql', function() {
        adapter.should.have.executed(
          'UPDATE "users" SET "username" = ?, "email_addr" = ? ' +
          'WHERE "id" = ?', ['jack', undefined, 231],
          'UPDATE "blogs" SET "title" = ?, "owner_id" = ? ' +
          'WHERE "id" = ?', [undefined, 231, 348]);
      });
    });
  });

}));
