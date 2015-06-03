'use strict';

require('./helpers');

var expect = require('chai').expect;
var Database = require('../lib/database');

describe('Database', function() {
  it('fails with an invalid adapter', function() {
    var config = {
      adapter: 'invalid_adapter',
      connection: {
        username: 'root',
        password: '',
        database: 'azul_test'
      }
    };
    expect(function() {
      Database.create(config);
    }).to.throw(/no adapter.*invalid_adapter/i);
  });

  it('fails with an object that is not an adapter', function() {
    var config = {
      adapter: {},
    };
    expect(function() {
      Database.create(config);
    }).to.throw(/invalid adapter/i);
  });

  it('loads adapters based on alias names', function() {
    expect(function() {
      Database.create({ adapter: 'postgres' });
    }).to.not.throw();
  });

  it('fails with when no configuration is given', function() {
    expect(function() {
      Database.create();
    }).to.throw(/missing connection/i);
  });
});
