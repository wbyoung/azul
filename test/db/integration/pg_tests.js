'use strict';

if (!/^(1|true)$/i.test(process.env.TEST_POSTGRES || '1')) { return; }

var expect = require('chai').expect;
var Database = require('../../../lib/db/database');

describe('PostgresQL', function() {
  it.skip('connects to the database', function() {
    var connection = {

    };
    var db = new Database(connection);
    expect(db._connection).to.exist;
  });
});
