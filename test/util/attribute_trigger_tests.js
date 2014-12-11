'use strict';

var chai = require('chai');
var expect = chai.expect;
var Class = require('../../lib/util/class');
var AttributeTrigger = require('../../lib/util/attribute_trigger');

describe('AttributeTrigger', function() {
  it('must be subclassed', function() {
    var trigger = AttributeTrigger.create();
    expect(function() { Class.extend({ property: trigger }); })
      .to.throw(/invoke.*must be.*subclass/i);
  });
});
