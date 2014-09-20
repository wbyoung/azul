'use strict';

var util = require('util');
var defineAccessor = require('../../util/accessor');
var Grammar = require('../grammar');
var Phrasing = require('../grammar/phrasing');

/**
 * The base Adapter class is the extension point for custom database adapters.
 * As a user of Agave, you typically won't use this, but if you're looking to
 * add support for a custom database, you should start here.
 *
 * @since 1.0
 * @public
 * @constructor
 */
function Adapter() {
  this._grammar = new this.constructor.Grammar();
  this._phrasing = new this.constructor.Phrasing(this._grammar);
}


/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @type {Grammar}
 */
Adapter.Grammar = Grammar;


/**
 * Documentation forthcoming.
 *
 * @since 1.0
 * @public
 * @type {Phrasing}
 */
Adapter.Phrasing = Phrasing;


/**
 * Access to the {@link Phrasing} instance.
 *
 * @name Adapter#phrasing
 * @since 1.0
 * @public
 * @type {Phrasing}
 * @readonly
 */
defineAccessor(Adapter, 'phrasing');

module.exports = Adapter;
