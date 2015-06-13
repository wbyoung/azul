'use strict';

require('../helpers');

var User;

describe('Model.hasOne pre-fetch', __db(function() {
  /* global db, adapter */

  beforeEach(require('../common').models);
  beforeEach(function() {
    User = db.model('user');
  });

  it('executes multiple queries', function() {
    return User.objects.with('blog').fetch().should.eventually.exist.meanwhile(adapter)
    .should.have.executed(
      'SELECT * FROM "users"',
      'SELECT * FROM "blogs" WHERE "owner_id" IN (?, ?)', [231, 844]);
  });

  it('works with all', function() {
    return User.objects.with('blog').all().fetch()
    .should.eventually.exist
    .meanwhile(adapter).should.have.executed(
      'SELECT * FROM "users"',
      'SELECT * FROM "blogs" WHERE "owner_id" IN (?, ?)', [231, 844]);
  });

  it('caches related objects', function() {
    return User.objects.with('blog').fetch().get('0')
    .should.eventually.have.properties({ id: 231, username: 'jack' })
    .and.to.have.property('blog').that.is.a.model('blog')
    .with.json({ id: 348, title: 'Azul.js', ownerId: 231 });
  });

  it('works with multiple results', function() {
    return User.objects.with('blog').fetch()
    .should.eventually.have.lengthOf(2).and
    .have.deep.property('[0]').that.is.a.model('user')
    .with.json({ id: 231, username: 'jack', email: 'jack@gmail.com' })
    .and.also.have.deep.property('[0].blog').that.is.a.model('blog')
    .with.json({ id: 348, ownerId: 231, title: 'Azul.js' })
    .and.also.have.deep.property('[1]').that.is.a.model('user')
    .with.json({ id: 844, username: 'susan', email: 'susan@gmail.com' })
    .and.also.have.deep.property('[1].blog').that.is.undefined;
  });

  it('works when no objects are returned', function() {
    adapter.respond(/select.*from "users"/i, []);
    return User.objects.with('blog').fetch().should.eventually.eql([]);
  });

  it('works via `fetchOne`', function() {
    return User.objects.where({ id: 231 }).limit(1).with('blog').fetchOne()
    .should.eventually.be.a.model('user')
    .with.json({ id: 231, username: 'jack', email: 'jack@gmail.com' })
    .and.have.property('blog').that.is.a.model('blog')
    .with.json({ id: 348, ownerId: 231, title: 'Azul.js' });
  });

  it('works via `find`', function() {
    return User.objects.with('blog').find(231)
    .should.eventually.be.a.model('user')
    .with.json({ id: 231, username: 'jack', email: 'jack@gmail.com' })
    .and.have.property('blog').that.is.a.model('blog')
    .with.json({ id: 348, ownerId: 231, title: 'Azul.js' });
  });

}));
