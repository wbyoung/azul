'use strict';

require('../helpers');

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon'); chai.use(require('sinon-chai'));
var cli = require('../../lib/cli');
var actions = require('../../lib/cli/actions');
var cmd = require('./cli_helpers').cmd;
var path = require('path');
var cp = require('child_process');

describe('CLI', function() {
  var azulfile = path.join(__dirname, '../fixtures/cli/azulfile.json');

  beforeEach(function() {
    sinon.stub(actions, 'init');
    sinon.stub(actions, 'migrate');
  });

  afterEach(function() {
    actions.init.restore();
    actions.migrate.restore();
  });

  it('provides help when no command is given', function(done) {
    process.argv = ['node', '/path/to/azul'];
    cmd({ modulePath: '.', configPath: azulfile }, cli)
    .then(function(proc) {
      expect(proc.exitStatus).to.eql(0);
      expect(proc.exitCalled).to.eql(true);
      expect(proc.stdout).to.match(/usage: azul \[options\] command/i);
      expect(proc.stdout.match(/--azulfile/g).length).to.eql(1);
    })
    .done(done, done);
  });

  it('provides help when local azul is missing', function(done) {
    process.argv = ['node', '/path/to/azul', '--help'];
    cmd({ modulePath: '.', configPath: null }, cli)
    .then(function(proc) {
      expect(proc.exitStatus).to.eql(0);
      expect(proc.exitCalled).to.eql(true);
      expect(proc.stdout).to.match(/usage: azul \[options\] command/i);
      expect(proc.stdout.match(/--azulfile/g).length).to.eql(1);
    })
    .done(done, done);
  });

  it('provides version when local azul is missing', function(done) {
    process.argv = ['node', '/path/to/azul', '--version'];
    cmd({ modulePath: '.', configPath: null }, cli)
    .then(function(proc) {
      expect(proc.exitStatus).to.eql(0);
      expect(proc.exitCalled).to.eql(true);
      expect(proc.stdout).to.match(/\d+\.\d+\.\d+(-(alpha|beta)\.\d+)?\n/i);
    })
    .done(done, done);
  });

  it('ensures a local azul is present', function(done) {
    process.argv = ['node', '/path/to/azul', 'migrate'];
    cmd({ modulePath: null, cwd: '.', configPath: azulfile }, cli)
    .then(function(proc) {
      expect(proc.exitStatus).to.not.eql(0);
      expect(proc.exitCalled).to.eql(true);
      expect(proc.stdout).to.match(/local azul not found/i);
      expect(actions.migrate).to.not.have.been.called;
    })
    .done(done, done);
  });

  it('ensures an azulfile is present', function(done) {
    process.argv = ['node', '/path/to/azul', 'migrate'];
    cmd({ modulePath: '.', configPath: null }, cli)
    .then(function(proc) {
      expect(proc.exitStatus).to.not.eql(0);
      expect(proc.exitCalled).to.eql(true);
      expect(proc.stdout).to.match(/no azulfile found/i);
      expect(actions.migrate).to.not.have.been.called;
    })
    .done(done, done);
  });

  it('does not need an azulfile for init', function(done) {
    process.argv = ['node', '/path/to/azul', 'init'];
    cmd({ modulePath: '.', configPath: null }, cli)
    .then(function(proc) {
      expect(proc.exitStatus).to.eql(0);
      expect(proc.exitCalled).to.eql(false);
      expect(proc.stdout).to.eql('');
      expect(actions.init).to.have.been.calledOnce;
    })
    .done(done, done);
  });

  it('calls actions when a command is given', function(done) {
    process.argv = ['node', '/path/to/azul', 'migrate'];
    cmd({ modulePath: '.', configPath: azulfile }, cli)
    .then(function(proc) {
      expect(proc.exitStatus).to.eql(0);
      expect(proc.exitCalled).to.eql(false);
      expect(proc.stdout).to.eql('');
      expect(actions.migrate).to.have.been.calledOnce;
    })
    .done(done, done);
  });

  it('passes config & options to actions', function(done) {
    process.argv = [
      'node', '/path/to/azul', 'migrate',
      '--migrations', './db-migrations'
    ];
    cmd({ modulePath: '.', configPath: azulfile }, cli)
    .then(function(proc) {
      expect(proc.exitStatus).to.eql(0);
      expect(proc.exitCalled).to.eql(false);
      expect(proc.stdout).to.eql('');
      expect(actions.migrate).to.have.been.calledOnce;
      expect(actions.migrate.getCall(0).args[0])
        .to.eql({ test: { adapter: 'mock' }});
      expect(actions.migrate.getCall(0).args[1].migrations)
        .to.eql('./db-migrations');
    })
    .done(done, done);
  });

  describe('exported event handlers', function() {
    it('displays a message when external modules are loaded', function(done) {
      cmd(null, function() { cli.require('xmod'); })
      .then(function(proc) {
        expect(proc.stdout).to.match(/requiring.*module.*xmod/i);
      })
      .done(done, done);
    });

    it('displays a message when external modules fail to load', function(done) {
      cmd(null, function() { cli.requireFail('xmod'); })
      .then(function(proc) {
        expect(proc.stdout).to.match(/failed.*module.*xmod/i);
      })
      .done(done, done);
    });

    it('displays a message when respawned', function(done) {
      cmd(null, function() { cli.respawn(['--harmony'], { pid: 1234 }); })
      .then(function(proc) {
        expect(proc.stdout).to.match(/flags.*--harmony.*\n.*respawn.*1234/im);
      })
      .done(done, done);
    });
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

  it('does not require local azul modules when showing help', function(done) {
    var helpPath = path.join(__dirname, '../fixtures/cli/help.js');
    var configPath = path.join(__dirname, '../../package.json');
    var cliPath = path.join(__dirname, '../../lib/cli/index.js');

    var child = cp.fork(helpPath, [], { env: process.env, silent: true });
    var message;
    var verify = function() {
      try {
        var local = message.modules.filter(function(name) {
          return !name.match(/azul\/node_modules/);
        });
        expect(local.sort()).to.eql([helpPath, configPath, cliPath].sort());
        done();
      }
      catch (e) { done(e); }
    };

    child.on('close', verify);
    child.on('message', function(m) { message = m; });
  });

});
