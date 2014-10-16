'use strict';

var expect = require('chai').expect;

var Schema = require('../../lib/db/schema');
var MockAdapter = require('../mocks/adapter');
var Statement = require('../../lib/db/grammar/statement');
var schema;

describe('Schema', function() {
  before(function() {
    schema = Schema.create(MockAdapter.create({}));
  });

  describe('#createTable', function() {

    it('generates the proper sql', function() {
      var query = schema.createTable('users', function(table) {
        table.string('name');
      });
      expect(query.sql()).to.eql(Statement.create(
        'create table users (name varchar(255))', []
      ));
    });

    it('generates the proper sql with multiple columns', function() {
      var query = schema.createTable('users', function(table) {
        table.serial('id');
        table.string('name');
      });
      expect(query.sql()).to.eql(Statement.create(
        'create table users (id serial, name varchar(255))', []
      ));
    });


    describe('types', function() {
      it('handles serial', function() {
        var query = schema.createTable('users', function(table) {
          table.serial('id');
        });
        expect(query.sql()).to.eql(Statement.create(
          'create table users (id serial)', []
        ));
      });
    });

    it('is thenable', function() {
      var query = schema.createTable('users', function(table) {
        table.string('name');
      });
      expect(query.then).to.exist;
    });

  });
});
