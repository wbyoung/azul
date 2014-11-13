'use strict';

var expect = require('chai').expect;
var inflection = require('../../lib/util/inflection');

describe('Inflection', function() {
  it('pluralizes', function() {
    expect(inflection.pluralize('dog')).to.eql('dogs');
  });

  it('singularizes', function() {
    expect(inflection.singularize('dogs')).to.eql('dog');
  });

  describe('uncountable', function() {
    it('pluralizes', function() {
      expect(inflection.pluralize('fish')).to.eql('fish');
    });

    it('singularizes', function() {
      expect(inflection.singularize('fish')).to.eql('fish');
    });
  });

  describe('irregulars', function() {
    it('pluralizes', function() {
      expect(inflection.pluralize('person')).to.eql('people');
    });

    it('pluralizes with capitalization', function() {
      expect(inflection.pluralize('Person')).to.eql('People');
    });

    it('pluralizes when already plural', function() {
      expect(inflection.pluralize('people')).to.eql('people');
    });

    it('pluralizes when already plural with capitalization', function() {
      expect(inflection.pluralize('People')).to.eql('People');
    });

    it('singularizes', function() {
      expect(inflection.singularize('people')).to.eql('person');
    });

    it('singularizes with capitalization', function() {
      expect(inflection.singularize('People')).to.eql('Person');
    });

    it('singularizes when already singular', function() {
      var i = new inflection.Inflection();
      i.singular(/s$/, '');
      i.irregular('octopus', 'octopi');
      expect(i.singularize('octopus')).to.eql('octopus');
    });

    it('singularizes when already singular with capitalization', function() {
      var i = new inflection.Inflection();
      i.singular(/s$/, '');
      i.irregular('octopus', 'octopi');
      expect(i.singularize('Octopus')).to.eql('Octopus');
    });
  });
});
