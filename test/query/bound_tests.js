'use strict';

var chai = require('chai');
var expect = chai.expect;

var Database = require('../../lib/database');
var BoundQuery = require('../../lib/query/bound');
var FakeAdapter = require('../fakes/adapter');
var Statement = require('../../lib/grammar/statement');

var db;

describe('BoundQuery', function() {
  before(function() {
    db = Database.create({ adapter: FakeAdapter.create({}) });
  });

  it('cannot be created directly', function() {
    expect(function() {
      BoundQuery.create();
    }).to.throw(/BoundQuery must be spawned/i);
  });

  it('defaults to selecting data', function() {
    var query = db.query.bind('users');
    expect(query.sql()).to.eql(Statement.create(
      'SELECT * FROM "users"', []
    ));
  });

  it('selects data', function() {
    var query = db.query.bind('users').all();
    expect(query.sql()).to.eql(Statement.create(
      'SELECT * FROM "users"', []
    ));
  });

  it('inserts data', function() {
    var query = db.query.bind('users').insert({ name: 'Whitney' });
    expect(query.sql()).to.eql(Statement.create(
      'INSERT INTO "users" ("name") VALUES (?)', ['Whitney']
    ));
  });

  it('updates data', function() {
    var query = db.query.bind('users').update({ name: 'Whitney' });
    expect(query.sql()).to.eql(Statement.create(
      'UPDATE "users" SET "name" = ?', ['Whitney']
    ));
  });

  it('deletes data', function() {
    var query = db.query.bind('users').delete();
    expect(query.sql()).to.eql(Statement.create(
      'DELETE FROM "users"', []
    ));
  });

  it('executes raw queries', function() {
    var query = db.query.bind('users').raw('SELECT * FROM "users"');
    expect(query.sql()).to.eql(Statement.create(
      'SELECT * FROM "users"', []
    ));
  });

  describe('pre-specified condition', function() {
    var query;
    before(function() {
      query = db.query.bind('users').where({ name: 'Whitney' });
    });

    it('allows select', function() {
      expect(query.all().sql()).to.eql(Statement.create(
        'SELECT * FROM "users" WHERE "name" = ?', ['Whitney']
      ));
    });

    it('allows update', function() {
      expect(query.update({ name: 'Whit' }).sql()).to.eql(Statement.create(
        'UPDATE "users" SET "name" = ? WHERE "name" = ?', ['Whit', 'Whitney']
      ));
    });

    it('allows delete', function() {
      expect(query.delete().sql()).to.eql(Statement.create(
        'DELETE FROM "users" WHERE "name" = ?', ['Whitney']
      ));
    });

    it('does not allow insert', function() {
      expect(function() {
        query.insert({ name: 'Whit' });
      }).to.throw(/cannot.*insert.*query.*where/i);
    });

    it('does not allow raw', function() {
      expect(function() {
        query.raw('SELECT * FROM "users"');
      }).to.throw(/cannot.*raw.*query.*where/i);
    });
  });

  describe('pre-specified order', function() {
    var query;
    before(function() {
      query = db.query.bind('users').orderBy('name');
    });

    it('does not allow insert', function() {
      expect(function() {
        query.insert({ name: 'Whit' });
      }).to.throw(/cannot.*insert.*query.*orderBy/i);
    });

    it('does not allow update', function() {
      expect(function() {
        query.update({ name: 'Whit' });
      }).to.throw(/cannot.*update.*query.*orderBy/i);
    });

    it('does not allow delete', function() {
      expect(function() {
        query.delete();
      }).to.throw(/cannot.*delete.*query.*orderBy/i);
    });

    it('does not allow raw', function() {
      expect(function() {
        query.raw('SELECT * FROM "users"');
      }).to.throw(/cannot.*raw.*query.*orderBy/i);
    });
  });

  describe('pre-specified limit', function() {
    var query;
    before(function() {
      query = db.query.bind('users').limit(3);
    });

    it('allows select', function() {
      expect(query.all().sql()).to.eql(Statement.create(
        'SELECT * FROM "users" LIMIT 3', []
      ));
    });

    it('does not allow insert', function() {
      expect(function() {
        query.insert({ name: 'Whit' });
      }).to.throw(/cannot.*insert.*query.*limit/i);
    });

    it('does not allow update', function() {
      expect(function() {
        query.update({ name: 'Whit' });
      }).to.throw(/cannot.*update.*query.*limit/i);
    });

    it('does not allow delete', function() {
      expect(function() {
        query.delete();
      }).to.throw(/cannot.*delete.*query.*limit/i);
    });

    it('does not allow raw', function() {
      expect(function() {
        query.raw('SELECT * FROM "users"');
      }).to.throw(/cannot.*raw.*query.*limit/i);
    });
  });
});
