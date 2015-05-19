'use strict';

var chai = require('chai');
var expect = chai.expect;

var Procedure = require('../../lib/query/mixins/procedure');

describe('Procedure Mixin', function() {
  it('defaults to an undefined procedure', function() {
    expect(Procedure._procedure()).to.eql(undefined);
  });
});
