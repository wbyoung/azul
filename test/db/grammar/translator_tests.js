'use strict';

var expect = require('chai').expect;

var Translator = require('../../../lib/db/grammar/translator');

describe('Translator', function() {

  it('raises for unsupported types', function() {
    var translator = Translator.create();
    expect(function() {
      translator.type('whatwhat');
    }).to.throw(/unhandled.*whatwhat/i);
  });

});
