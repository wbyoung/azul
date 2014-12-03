'use strict';

var _ = require('lodash');
var Model = require('../../lib/model');

Model.reopenClass({
  fresh: function() {
    var args = Array.prototype.slice.call(arguments);
    var data = args.shift();
    var alteredData = _.extend({ _persisted: true }, data);
    args.unshift(alteredData);
    return this.create.apply(this, args);
  }
});
