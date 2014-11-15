'use strict';

var Property = require('../util/property').Class;

var Manager = Property.extend({
  init: function() {
    this._super(this.getter());
  },

  getter: function() {
    var self = this;
    return function() {
      if (self._query) { return self.query(); }

      var modelClass = this;
      var tableName = modelClass.tableName();
      var create = modelClass.create.bind(modelClass);
      var query = modelClass.query.bind(tableName).transform(function(result) {
        return result.rows.map(create);
      });
      self._query = query;

      return self.query();
    };
  },

  query: function() {
    return this._query.clone();
  }
});

module.exports = Manager.reopenClass({ __name__: 'Manager' });
