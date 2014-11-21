'use strict';

var _ = require('lodash');
var Model = require('../../lib/model');

Model.reopenClass({
  fresh: function() {
    return _.extend(this.create.apply(this, arguments), {
      dirty: false,
      persisted: true
    });
  }
});
