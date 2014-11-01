'use strict';

var _ = require('lodash');
var util = require('util');
var expect = require('chai').expect;
var path = require('path');
var BluebirdPromise = require('bluebird');

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

    describe('types', function() {

      // shared behavior for type tests
      var via = function(type, data, equal) {
        return function(done) {
          var table = util.format('azul_type_%s', type);
          var expected = this.expectationTypeCast(type, data);
          BluebirdPromise.bind(this)
          .then(function() {
            return db.schema.createTable(table, function(table) {
              table[type]('column');
            });
          })
          .then(function() {
            return db.insert(table, { column: data });
          })
          .then(function() {
            return db.select(table);
          }).get('rows').get('0')
          .then(function(result) {
            expect(result.column).to[equal || 'equal'](expected);
          })
          .finally(function() {
            return db.schema.dropTable(table);
          })
          .done(function() { done(); }, done);
        };
      };

      it('supports `auto`', via('auto', 1));
      it('supports `increments`', via('increments', 1));
      it('supports `serial`', via('serial', 1));
      it('supports `integer`', via('integer', 1));
      it('supports `integer64`', via('integer64', 1));
      it('supports `string`', via('string', 'hello world'));
      it('supports `text`', via('text', 'hello world'));
      it('supports `binary`', via('binary', 'hello world', 'eql'));
      it('supports `bool`', via('bool', true));
      it('supports `date`', via('date', new Date(2014, 10-1, 31), 'eql'));
      it('supports `time`', via('time', '11:57:23'));
      it('supports `dateTime`', via('dateTime', new Date(2014, 10-1, 31), 'eql'));
      it('supports `float`', via('float', 3.14159));
      it('supports `decimal`', via('decimal', 3.14159));
    });

    describe('conditions', function() {
      it('supports `exact`');
      it('supports `iexact`');
      it('supports `in`');
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
  });
};
