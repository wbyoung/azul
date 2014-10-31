'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../../lib/db');
var UpdateQuery = require('../../../lib/db/query/update');
var MockAdapter = require('../../mocks/adapter');
var Statement = require('../../../lib/db/grammar/statement');
var LiteralString = require('../../../lib/db/condition/literal'),
  l = LiteralString.l;
var FieldString = require('../../../lib/db/condition/field'),
  f = FieldString.f;

var db;

describe('UpdateQuery', function() {
  before(function() {
    db = Database.create({ adapter: MockAdapter.create({}) });
  });

  it('cannot be created directly', function() {
    expect(function() {
      UpdateQuery.create();
    }).to.throw(/UpdateQuery must be spawned/i);
  });

  it('updates data', function() {
    expect(db.update('users', { name: 'Whitney' }).sql()).to.eql(Statement.create(
      'UPDATE "users" SET "name" = ?', ['Whitney']
    ));
  });

  it('updates multiple values', function() {
    var query = db.update('users', { first: 'Whitney', last: 'Young' });
    expect(query.sql()).to.eql(Statement.create(
      'UPDATE "users" SET "first" = ?, "last" = ?', ['Whitney', 'Young']
    ));
  });

  it('updates data via #set', function() {
    expect(db.update('users').set({ name: 'Whitney' }).sql()).to.eql(Statement.create(
      'UPDATE "users" SET "name" = ?', ['Whitney']
    ));
  });

  it('multiple calls to #set merge in new values', function() {
    var query = db.update('users')
      .set({ first: 'Whitney', last: 'Young' })
      .set({ first: 'Whit' });
    expect(query.sql()).to.eql(Statement.create(
      'UPDATE "users" SET "first" = ?, "last" = ?', ['Whit', 'Young']
    ));
  });

  it('works with literal based statements', function() {
    var query = db.update('users', { name: l('"first" + "last"') });
    expect(query.sql()).to.eql(Statement.create(
      'UPDATE "users" SET "name" = "first" + "last"', []
    ));
  });

  it('works with field based statements', function() {
    var query = db.update('users', { name: f('first') });
    expect(query.sql()).to.eql(Statement.create(
      'UPDATE "users" SET "name" = "first"', []
    ));
  });

  it('cannot be used without values to set', function() {
    var query = db.update('users');
    expect(function() {
      query.sql();
    }).to.throw(/must specify values to set/i);
  });

});
