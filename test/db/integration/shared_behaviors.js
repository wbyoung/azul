'use strict';

var _ = require('lodash');
var util = require('util');
var expect = require('chai').expect;
var path = require('path');
var BluebirdPromise = require('bluebird');
var Condition = require('../../../lib/db/condition'),
  w = Condition.w;

module.exports.shouldRunMigrationsAndQueries = function() {
  var db; before(function() { db = this.db; });

  describe('with migrations applied', function() {
    before(function(done) {
      var migration =
        path.join(__dirname, '../../fixtures/migrations/blog');
      this.migrator = db.migrator(migration);
      this.migrator.migrate().then(function() { done(); }, done);
    });

    after(function(done) {
      this.migrator.rollback().then(function() { done(); }, done);
    });

    afterEach(function(done) {
      this.resetSequence('articles').then(function() { done(); }, done);
    });

    it('can insert, update, and delete data', function(done) {
      BluebirdPromise.bind({})
      .then(function() {
        return db
          .insert('articles', { title: 'Title 1', body: 'Contents 1'});
      }).get('rows').get('0')
      .then(function(article) { expect(article).to.not.exist; })
      .then(function() {
        return db
          .insert('articles', { title: 'Title 2', body: 'Contents 2'})
          .returning('id');
      }).get('rows').get('0')
      .then(function(article) { expect(article.id).to.eql(2); })
      .then(function() { return db.select('articles'); }).get('rows')
      .then(function(articles) {
        expect(_.sortBy(articles, 'id')).to.eql([
          { id: 1, title: 'Title 1', body: 'Contents 1'},
          { id: 2, title: 'Title 2', body: 'Contents 2'}
        ]);
      })
      .then(function() {
        return db.update('articles', { title: 'Updated' }).where({ id: 1 });
      })
      .then(function() { return db.select('articles'); }).get('rows')
      .then(function(articles) {
        expect(_.sortBy(articles, 'id')).to.eql([
          { id: 1, title: 'Updated', body: 'Contents 1'},
          { id: 2, title: 'Title 2', body: 'Contents 2'}
        ]);
      })
      .then(function() { return db.delete('articles'); })
      .then(function() { return db.select('articles'); }).get('rows')
      .then(function(articles) {
        expect(articles).to.eql([]);
      })
      .done(done, done);
    });
  });
};

module.exports.shouldSupportStandardTypes = function() {
  var db; before(function() { db = this.db; });

  // shared behavior for type tests
  var viaOptions = function(type, data, expected, options, equal, fn) {
    var table = util.format('azul_type_%s', type);
    var cast = function(result) {
      return this.castDatabaseValue(type, result, options);
    };
    equal = equal || 'equal';
    fn = fn || function() {};
    return function(done) {
      BluebirdPromise.bind(this)
      .then(function() {
        return db.schema.createTable(table, function(table) {
          fn(table[type]('column', options));
        });
      })
      .then(function() { return db.insert(table, { column: data }); })
      .then(function() { return db.select(table); })
      .get('rows')
      .get('0')
      .get('column')
      .then(cast)
      .then(function(result) {
        expect(result).to[equal](expected);
      })
      .finally(function() { return db.schema.dropTable(table).ifExists(); })
      .done(function() { done(); }, done);
    };
  };
  var via = function(type, data, equal) {
    return viaOptions(type, data, data, undefined, equal);
  };

  describe('types', function() {

    it('supports `auto`', via('auto', 1));
    it('supports `increments`', via('increments', 1));
    it('supports `serial`', via('serial', 1));
    it('supports `integer`', via('integer', 1));
    it('supports `integer64`', via('integer64', 1));
    it('supports `string`', via('string', 'hello world'));
    it('supports `text`', via('text', 'hello world'));
    it('supports `binary`', via('binary', new Buffer('hello world'), 'eql'));
    it('supports `bool`', via('bool', true));
    it('supports `date`', via('date', new Date(2014, 10-1, 31), 'eql'));
    it('supports `time`', via('time', '11:57:23'));
    it('supports `dateTime`', via('dateTime', new Date(2014, 10-1, 31), 'eql'));
    it('supports `float`', via('float', 3.14159));
    it('supports `decimal`', via('decimal', 3.14159));

    it('supports `string` length', viaOptions('string', 'val', 'val', {
      length: 3
    }));

    it('supports `decimal`', viaOptions('decimal', 3.14159, 3.14159));

    it('supports `decimal` precision', viaOptions('decimal', 3.14159, 3, {
      precision: 3
    }));

    it('supports `decimal` options', viaOptions('decimal', 3.14159, 3.14, {
      precision: 4,
      scale: 2
    }));

    it('supports `pk`', viaOptions('string', 'key', 'key', {}, null,
      function(col) { col.pk(); }));

    it('supports `primaryKey`', viaOptions('string', 'key', 'key', {}, null,
      function(col) { col.primaryKey(); }));

    it('supports `default`', function(done) {
      var table = 'azul_default';
      var value = 'azul\'s default\\\n\t\b\r\x1a"';
      BluebirdPromise.bind(this)
      .then(function() {
        return db.schema.createTable(table, function(table) {
          table.string('required');
          table.string('string').default(value);
          table.integer('integer').default(3);
        });
      })
      .then(function() { return db.insert(table, { required: '' }); })
      .then(function() { return db.select(table); })
      .get('rows')
      .get('0')
      .then(function(result) {
        expect(result).to.eql({ required: '', string: value, integer: 3 });
      })
      .finally(function() { return db.schema.dropTable(table).ifExists(); })
      .done(function() { done(); }, done);
    });

    it('supports `notNull`', function(done) {
      var table = 'azul_not_null';
      BluebirdPromise.bind(this)
      .then(function() {
        return db.schema.createTable(table, function(table) {
          table.string('column').notNull();
        });
      })
      .then(function() { return db.insert(table, { column: null }); })
      .throw(new Error('Expected insert error to occur.'))
      .catch(function(e) {
        expect(e.message).to.match(/(cannot|violates|constraint).*null/i);
      })
      .finally(function() { return db.schema.dropTable(table).ifExists(); })
      .done(function() { done(); }, done);
    });

    it('supports `unique`', function(done) {
      var table = 'azul_unique';
      BluebirdPromise.bind(this)
      .then(function() {
        return db.schema.createTable(table, function(table) {
          table.string('column').unique();
        });
      })
      .then(function() { return db.insert(table, { column: 'val' }); })
      .then(function() { return db.insert(table, { column: 'val' }); })
      .throw(new Error('Expected insert error to occur.'))
      .catch(function(e) {
        expect(e.message).to.match(/duplicate|unique constraint/i);
      })
      .finally(function() { return db.schema.dropTable(table).ifExists(); })
      .done(function() { done(); }, done);
    });
  });
};

module.exports.shouldSupportStandardConditions = function() {
  var db; before(function() { db = this.db; });

  describe('conditions', function() {
    beforeEach(function(done) {
      db.schema.createTable('people', function(table) {
        table.string('name');
        table.integer('height');
        table.date('dob');
      })
      .then(function() {
        return db.insert('people')
          .values({ name: 'Jim', height: 69, dob: new Date(1968, 2, 14) })
          .values({ name: 'Kristen', height: 65, dob: new Date(1982, 12, 20) })
          .values({ name: 'Sarah', height: 64, dob: new Date(1991, 9, 1) })
          .values({ name: 'Tim', height: 72, dob: new Date(1958, 4, 14) });
      })
      .then(function() { done(); }, done);
    });

    afterEach(function(done) {
      db.schema.dropTable('people').ifExists()
        .then(function() { done(); }, done);
    });

    it('supports `exact`', function(done) {
      db.select('people').where(w({
        'name[exact]': 'Jim',
        'height[exact]': 69,
        'dob[exact]': new Date(1968, 2, 14)
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Jim']);
      })
      .then(done, done);
    });

    it('supports `iexact`', function(done) {
      db.select('people').where(w({
        'name[iexact]': 'kristen'
      }))
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Kristen']);
      })
      .then(done, done);
    });

    it.skip('supports `in`', function(done) {
      db.select('people').where(w({
        'name[in]': ['Sarah', 'Tim']
      }))
      .orderBy('name')
      .execute()
      .get('rows')
      .then(function(result) {
        expect(_.map(result, 'name')).to.eql(['Sarah', 'Tim']);
      })
      .then(done, done);
    });

    it('supports `gt`');
    it('supports `gte`');
    it('supports `lt`');
    it('supports `lte`');
    it('supports `between`');
    it('supports `isull`');

    it('supports `contains`');
    it('supports `icontains`');
    it('supports `startsWith`');
    it('supports `istartsWith`');
    it('supports `endsWith`');
    it('supports `iendsWith`');
    it('supports `regex`');
    it('supports `iregex`');

    it('supports `year`');
    it('supports `month`');
    it('supports `day`');
    it('supports `weekday`');
    it('supports `hour`');
    it('supports `minute`');
    it('supports `second`');
  });
};
