'use strict';

var Property = require('corazon').Property;

// we rely on the bound query class adding to functionality to the entry query
// class, so make sure it's loaded.
require('../query/bound');

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
 * @public
 * @constructor Manager
 * @extends Property
 */
var Manager = Property.extend(/** @lends Manager# */ {
  init: function() {
    this._super();
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
      // jscs:disable safeContextKeyword
      var modelClass = this;
      var query = modelClass.query
        .bind(modelClass)
        .autoload();

      // store the query object on this manager so that we can call `query`
      // without having to pass any arguments. this allows a simpler override
      // of the `query` method. note, though, that for various reasons this is
      // not cache of the query. first, the query returned from this manager
      // should be a new query each time. second, and more importantly, the
      // manager will be reused across multiple model classes & potentially
      // with multiple adapters. caching the result on the manager would mean
      // that the same query would be re-used in these different situations.
      var result;
      self._query = query;
      result = self.query();
      self._query = undefined;
      return result;
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
    return this._query;
  }
});

module.exports = Manager.reopenClass({ __name__: 'Manager' });
