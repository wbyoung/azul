'use strict';

var expect = require('chai').expect;
var cli = require('../../lib/cli');
var path = require('path');
var cp = require('child_process');

describe('CLI', function() {
  it('provides help when no command is given');

  it('provides help when local azul is missing');
  it('provides help when azulfile is missing');

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
