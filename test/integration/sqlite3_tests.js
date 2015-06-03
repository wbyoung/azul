'use strict';

require('../helpers');

if (!/^(1|true)$/i.test(process.env.TEST_SQLITE || '1')) { return; }

var _ = require('lodash');
var Database = require('../../lib/database');
var Promise = require('bluebird');
var shared = require('./shared_behaviors');

var db, connection = {
  adapter: 'sqlite3',
  connection: {
    filename: ''
  }
};

var resetSequence = Promise.method(function(/*table*/) {
  // no need to reset
});

var castDatabaseValue = function(type, value, options) {
  switch (type) {
    case 'date': // dates are converted & stored as timestamps
    case 'dateTime': value = new Date(value); break;
    case 'bool': value = Boolean(value); break; // bool is stored as number
    case 'decimal': // precision & scale not supported, so fake it here
      value = _.size(options) ? +value.toFixed(options.scale) : value;
      break;
  }
  return value;
};

describe('SQLite3', function() {
  before(function() { db = this.db = Database.create(connection); });
  before(function() { this.resetSequence = resetSequence; });
  before(function() { this.castDatabaseValue = castDatabaseValue; });
  after(function(done) { db.disconnect().then(done, done); });

  // run all shared examples
  var skip = /`i?regex|year|month|day|weekday|hour|minute|second`/i;
  _.each(shared({ skip: skip }), function(fn, name) {
    if (fn.length !== 0) {
      throw new Error('Cannot execute shared example: ' + name);
    }
    fn();
  });
});
