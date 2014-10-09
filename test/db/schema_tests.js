'use strict';

var expect = require('chai').expect;

var Schema = require('../../lib/db/schema');
var MockAdapter = require('../mocks/adapter');
var Statement = require('../../lib/db/grammar/statement');
var schema;

describe('Schema', function() {
  before(function() {
    schema = Schema.create(MockAdapter.create());
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

  });
});
