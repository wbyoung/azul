'use strict';

var chai = require('chai');
var expect = chai.expect;
var actions = require('../../lib/cli/actions');
var cmd = require('./cli_helpers').cmd;
var path = require('path');

var adapter,
  config,
  migrations,
  azulfile;

describe('CLI', function() {
  beforeEach(function() {
    adapter = require('../fakes/adapter').create({});
    config = { adapter: adapter };
    migrations = path.join(__dirname, '../fixtures/migrations/blog');
    azulfile = {
      development: config,
      production: config,
      staging: config,
      test: config
    };
  });

  describe('migrate action', function() {
    it('performs a schema migration', function(done) {
      cmd({}, function() {
        return actions.migrate(azulfile, { migrations: migrations });
      })
      .then(function(proc) {
        expect(proc.exitStatus).to.eql(0);
        expect(proc.exitCalled).to.eql(false);
        expect(proc.stdout).to.match(/batch 1/i);
        expect(proc.stdout).to.match(/20141022202234_create_articles/i);
        expect(proc.stdout).to.match(/20141022202634_create_comments/i);
      })
      .done(done, done);
    });

    it('displays a up-to-date message when there is nothing to apply');

    it('fails schema migration when directory is missing', function(done) {
      cmd({}, function() {
        return actions.migrate(azulfile, { migrations: './missing-dir' });
      })
      .then(function(proc) {
        expect(proc.exitStatus).to.eql(1);
        expect(proc.exitCalled).to.eql(true);
        expect(proc.stdout).to.match(/failed.*ENOENT.*missing-dir/i);
      })
      .done(done, done);
    });
  });

});
