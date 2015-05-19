'use strict';

var expect = require('chai').expect;

var Translator = require('../../lib/dialect/translator');

describe('Translator', function() {

  it('raises for unsupported types', function() {
    var translator = Translator.create();
    expect(function() {
      translator.type('whatwhat');
    }).to.throw(/unhandled.*whatwhat/i);
  });

  it('generates string with default length', function() {
    var translator = Translator.create();
    expect(translator.type('string')).to.eql('varchar(255)');
  });

  it('generates string with options', function() {
    var translator = Translator.create();
    expect(translator.type('string', { length: 20 })).to.eql('varchar(20)');
  });

  it('generates decimal', function() {
    var translator = Translator.create();
    var decimal = translator.type('decimal');
    expect(decimal).to.eql('numeric');
  });

  it('generates decimal with precision and scale', function() {
    var translator = Translator.create();
    var decimal = translator.type('decimal', { precision: 20, scale: 10 });
    expect(decimal).to.eql('numeric(20, 10)');
  });

  it('generates decimal with precision', function() {
    var translator = Translator.create();
    var decimal = translator.type('decimal', { precision: 20 });
    expect(decimal).to.eql('numeric(20)');
  });

  it('cannot generate decimal with just scale', function() {
    var translator = Translator.create();
    expect(function() {
      translator.type('decimal', { scale: 2 });
    }).to.throw(/specify precision.*scale/i);
  });

});
