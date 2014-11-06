'use strict';

var expect = require('chai').expect;
var cli = require('../../lib/cli');

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

  it('does not require local azul modules when loaded');
  it('does not require local azul modules when showing help');

});
