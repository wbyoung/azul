'use strict';

var _ = require('lodash');
var Model = require('../../lib/model');

Model.reopenClass({
  fresh: function() {
    var args = _.toArray(arguments);
    var data = args.shift();
    var alteredData = _.extend({ _newRecord: false }, data);
    args.unshift(alteredData);
    return this.create.apply(this, args);
  }
});
