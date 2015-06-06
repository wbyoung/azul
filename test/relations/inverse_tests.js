'use strict';

require('../helpers');

var InverseRelation = require('../../lib/relations/inverse');

describe('InverseRelation', function() {

  it('cannot be created', function() {
    expect(function() {
      InverseRelation.create();
    }).to.throw(/inverserelation.*cannot be initialized/i);
  });

});
