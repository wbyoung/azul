'use strict';

var Class = require('corazon/class');
var property = require('corazon/property');

/**
 * A condition expression node (tree).
 *
 * @private
 * @constructor
 * @param {String} type The node type.
 * @param {Array.<Node>} children The children of this node.
 * @param {Object} attrs The attributes for the node.
 */
var Node = Class.extend(/** @lends Node# */ {
  init: function(type, children, attrs) {
    this._super();
    this._type = type;
    this._children = children;
    this._attrs = attrs || {};
  },

  /**
   * The type of the node.
   *
   * @type {String}
   * @public
   * @readonly
   */
  type: property(),

  /**
   * The attributes that were specified when creating the node.
   *
   * @type {Object}
   * @public
   * @readonly
   */
  attrs: property(),

  /**
   * The children that were specified when creating the node.
   *
   * @type {Array.<Node>}
   * @public
   * @readonly
   */
  children: property(),

  /**
   * A convenience method for children[0].
   *
   * @type {Node}
   * @public
   * @readonly
   */
  firstChild: property(function() { return this.children[0]; }),

  /**
   * A convenience method for children[1].
   *
   * @type {Node}
   * @public
   * @readonly
   */
  secondChild: property(function() { return this.children[1]; }),

  /**
   * @function Node~ReduceCallback
   *
   * @param {Node} node The node to reduce.
   * @param {Array} children The reduced children.
   * @return {Object} The reduced value.
   */

  /**
   * Reduce a node tree. This performs a depth-first, traversal of a node,
   * traversing children in order and applies the function to each element.
   * The value returned from each reduction will then become one of the
   * elements for `children` in the next reduction.
   *
   * @param {Node~TransformCallback} fn The reduction function.
   * @return {Object} The value of the reduction.
   */
  reduce: function(fn, thisArg) {
    var children = this._children.map(function(child) {
      return child.reduce(fn, thisArg);
    });
    return fn.call(thisArg, this, children);
  },

  /**
   * @function Node~TransformCallback
   *
   * @param {Node} node The node to transform.
   * @return {Node} The transformed value.
   */

  /**
   * Transform a node tree. Note that this method is slow, if you do not need
   * a full copy of the tree, you should consider using {@link Node#reduce}.
   *
   * @param {Node~TransformCallback} fn The reduction function.
   * @return {Node} The transformed node tree.
   */
  transform: function(fn, thisArg) {
    return this.reduce(function(node, children) {
      var result = node.__identity__.new();
      result._type = node._type;
      result._attrs = node._attrs;
      result._children = children;
      return fn.call(thisArg, result);
    });
  }

});

module.exports = Node.reopenClass({ __name__: 'Node' });
