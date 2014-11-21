'use strict';

var Model = require('../../lib/model');
var property = require('../../lib/util/property').fn;

Model.reopen({
  fresh: property(function() {
    this._super();
    this.reset();
    return this;
  })
});
