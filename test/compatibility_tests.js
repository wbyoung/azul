'use strict';

require('./helpers');

var chai = require('chai');
var expect = chai.expect;

var validate = require('../lib/compatibility');

describe('compatibility', function() {

  it('validates', function() {
    expect(validate).not.to.throw();
  });

  describe('when `corazon` class has been swapped out', function() {
    beforeEach(function() {
      var corazon = require('corazon');
      this.Class = corazon.Class;
      corazon.Class = corazon.Class.extend();
    });

    afterEach(function() {
      require('corazon').Class = this.Class;
    });

    it('throws', function() {
      expect(validate).throw(/incompatible.*azul.*maguey/i);
    });
  });

});
