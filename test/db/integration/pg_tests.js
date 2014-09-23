'use strict';

var skip = false;
try { skip = !JSON.parse(process.env.TEST_POSTGRES); }
catch (e) {}
if (skip) { return; }

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
