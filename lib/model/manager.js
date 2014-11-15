'use strict';

var Property = require('../util/property').Class;

/**
 * The object manager for models.
 *
 * Managers allow you to pre-configure queries for collections of objects that
 * are frequently accessed. You can define new collections on your model and
 * also have the ability to override the default `objects` collection.
 *
 * For example, setting up custom managers to allow quick access to
 * `Person.men` and `Person.women` would be done like so:
 *
 *     var FemaleManager = Manager.extend({
 *       query: function() {
 *         return this._super().where({ sex: 'female' });
 *       }
 *     });
 *
 *     var MaleManager = Manager.extend({
 *       query: function() {
 *         return this._super().where({ sex: 'male' });
 *       }
 *     });
 *
 *     var Person = Model.extend({}, {
 *       women: FemaleManager.create(),
 *       men: MaleManager.create(),
 *       objects: Manager.create() // could customize...
 *     });
 *
 * @since 1.0
 * @public
 * @constructor Manager
 * @extends Property
 */
var Manager = Property.extend({
  init: function() {
    this._super(this._getter());
  },

  /**
   * Return a getter function for this property.
   *
   * The getter function for a manager is responsible for setting up a bound
   * query that transforms the results into instances of the model class. The
   * getter method will always be attached as a static method of a
   * {@link Model}.
   *
   * @return {Function} The getter function.
   */
  _getter: function() {
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

  /**
   * Override this method to configure how this manager will query for data.
   *
   * Make sure you always call super.
   *
   * @return {ChainedQuery} A new query.
   */
  query: function() {
    return this._query.clone();
  }
});

module.exports = Manager.reopenClass({ __name__: 'Manager' });
