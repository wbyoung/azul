'use strict';

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var cli = require('../../lib/cli');
var actions = require('../../lib/cli/actions');
var path = require('path');
var cp = require('child_process');
var BluebirdPromise = require('bluebird');

/**
 * Helper function to run the CLI and capture output/exit status. The resolved
 * object will contain the following properties:
 *
 *   - `stdout` - The standard output for the cli
 *   - `exit` - The exit status
 *   - `exitCalled` - Whether `process.exit` was called
 *
 * @param {Object} env Liftoff environment configuration.
 * @return {Promise} A promise.
 */
var runCLI = function(env) {
  var details = { stdout: '', exit: 0 };

  sinon.stub(process, 'exit', function(status) {
    throw _.extend(new Error('Exit called.'), {
      code: 'PROCESS_EXIT_CALLED',
      status: status || 0
    });
  });
  sinon.stub(process.stdout, 'write', function(data) {
    details.stdout += data.toString();
  });

  return BluebirdPromise
  .resolve(env)
  .then(cli)
  .catch(function(e) {
    if (e.code === 'PROCESS_EXIT_CALLED') {
      details.exit = e.status;
      details.exitCalled = true;
    }
    else { throw e; }
  })
  .return(details)
  .finally(function() {
    process.exit.restore();
    process.stdout.write.restore();
  });
};

describe('CLI', function() {
  beforeEach(function() {
    sinon.stub(actions, 'migrate');
  });

  afterEach(function() {
    actions.migrate.restore();
  });

  it('provides help when no command is given', function(done) {
    process.argv = ['node', '/path/to/azul'];
    runCLI({ modulePath: '.', configPath: 'azulfile.js' })
    .then(function(proc) {
      expect(proc.exit).to.eql(0);
      expect(proc.exitCalled).to.eql(true);
      expect(proc.stdout).to.match(/usage: azul \[options\] command/i);
      expect(proc.stdout.match(/--azulfile/g).length).to.eql(1);
    })
    .done(done, done);
  });

  it('provides help when local azul is missing', function(done) {
    process.argv = ['node', '/path/to/azul', '--help'];
    runCLI({ modulePath: '.', configPath: null })
    .then(function(proc) {
      expect(proc.exit).to.eql(0);
      expect(proc.exitCalled).to.eql(true);
      expect(proc.stdout).to.match(/usage: azul \[options\] command/i);
      expect(proc.stdout.match(/--azulfile/g).length).to.eql(1);
    })
    .done(done, done);
  });

  it('provides version when local azul is missing', function(done) {
    process.argv = ['node', '/path/to/azul', '--version'];
    runCLI({ modulePath: '.', configPath: null })
    .then(function(proc) {
      expect(proc.exit).to.eql(0);
      expect(proc.exitCalled).to.eql(true);
      expect(proc.stdout).to.match(/\d+\.\d+\.\d+\n/i);
    })
    .done(done, done);
  });

  it('ensures a local azul is present');
  it('ensures an azulfile is present');

  it('calls actions when a command is given');
  it('passes options to actions');

  describe('exported event handlers', function() {
    it('displays a message when external modules are loaded');
    it('displays a message when external modules fail to load');
    it('displays a message when respawned');
  });
});

describe('CLI loading', function() {

  it('does not require local azul modules when loaded', function(done) {
    var loader = path.join(__dirname, '../fixtures/cli/load.js');
    var cliPath = path.join(__dirname, '../../lib/cli/index.js');

    var child = cp.fork(loader, [], { env: process.env });
    var message;
    var verify = function() {
      try {
        var local = message.modules.filter(function(name) {
          return !name.match(/azul\/node_modules/);
        });
        expect(local.sort()).to.eql([loader, cliPath].sort());
        done();
      }
      catch (e) { done(e); }
    };

    child.on('close', verify);
    child.on('message', function(m) { message = m; });
  });

  it('does not require local azul modules when showing help');

});
