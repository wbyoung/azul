'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var ModelQuery = require('../../lib/query/model');
var FakeAdapter = require('../fakes/adapter');
var property = require('../../lib/util/property').fn;

var db,
  adapter;

describe('ModelQuery', function() {
  beforeEach(function() {
    adapter = FakeAdapter.create({});
    db = Database.create({ adapter: adapter });
  });

  it('cannot be created directly', function() {
    expect(function() {
      ModelQuery.create();
    }).to.throw(/ModelQuery must be spawned/i);
  });

  it('gives a useful error when bad attr is used in `where`', function() {
    expect(function() {
      db.query.bind(db.model('user')).where({ invalidAttr: 'value' }).all();
    }).to.throw(/invalid field.*"invalidAttr".*user query.*user class/i);
  });

  it('gives a useful error when bad relation is used for `with`', function() {
    expect(function() {
      db.query.bind(db.model('user')).with('streets');
    }).to.throw(/no relation.*"streets".*with.*user query/i);
  });

  it('does not allow `with` on non-select queries', function() {
    expect(function() {
      var Model = db.model('author', { author: db.belongsTo() });
      db.query.bind(Model).with('author').update();
    }).to.throw(/cannot perform.*update.*after.*with/i);
  });

  it('does not allow `with` on unbound queries', function() {
    expect(function() {
      db.select('users').with('author');
    }).to.throw(/cannot perform.*with.*unbound/i);
  });

  it('does not allow `with` on bound then unbound queries', function() {
    expect(function() {
      var Model = db.model('author', { author: db.belongsTo() });
      db.query.bind(Model).unbind().with('author');
    }).to.throw(/cannot perform.*with.*unbound/i);
  });

  it('gives a useful error when bad relation is used for `join`', function() {
    expect(function() {
      db.query.bind(db.model('user')).join('streets');
    }).to.throw(/no relation.*"streets".*join.*user query/i);
  });

  it('re-throws when auto-join is used and error is not expected', function() {
    var Model = db.model('article', {
      authorRelation: property(function() {
        throw new Error('test error');
      }),
    });
    expect(function() {
      db.query.bind(Model).where({ 'author.id': 7 }).statement.sql;
    }).to.throw(/test error/i);
  });

});
