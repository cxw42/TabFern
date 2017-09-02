/**
 * ### Flagnode plugin
 *
 * Adds to jsTree the ability to highlight nodes, independently of what's
 * selected.
 *
 * Modified from jstree.search.js.
 */
/*globals jQuery, define, exports, require, document */
(function (factory) {
	"use strict";
	if (typeof define === 'function' && define.amd) {
		define('jstree.search', ['jquery','jstree'], factory);
	}
	else if(typeof exports === 'object') {
		factory(require('jquery'), require('jstree'));
	}
	else {
		factory(jQuery, jQuery.jstree);
	}
}(function ($, jstree, undefined) {
	"use strict";

	if($.jstree.plugins.flagnode) { return; }

	/**
	 * stores all defaults for the flagnode plugin
	 * @name $.jstree.defaults.flagnode
	 * @plugin flagnode
	 */
	$.jstree.defaults.flagnode = {
		/**
		 * The class to be applied to matches
		 */
		css_class : 'jstree-flagnode'
	};

	$.jstree.plugins.flagnode = function (options, parent) {
		this.bind = function () {
			parent.bind.call(this);
			this._data.flagnode.flagged_nodes={};	//map node IDs to true.
				// It's a hash so we can add and delete in O(1).
		}; //bind()

		/**
		 * Helper to set the flag state on a node
		 * @param {jsTree} tree The `this` value from the caller
		 * @param {jQuery} jq_node The jQuery node(s) to adjust, if any
		 * @param {Boolean} should_flag Whether to set or clear the flag
		 */
		function setflagstate(tree, jq_node, should_flag)
		{
			var cls = tree.settings.flagnode.css_class;
			if(should_flag) {
				jq_node.children('.jstree-anchor').addClass(cls);
				jq_node.each(function(unused,elem){
					tree._data.flagnode.flagged_nodes[elem.id] = true;
				});
			} else {
				jq_node.children('.jstree-anchor').removeClass(cls);
				jq_node.each(function(unused,elem){
					delete tree._data.flagnode.flagged_nodes[elem.id];
				});
			}
		} //setflagstate()

		/**
		 * flag or unflag a given node
		 * @name flag_node(obj [, should_flag])
		 * @param {mixed} obj the node to flag, or an array of nodes to flag
		 * @param {Boolean} should_flag (default true) if true, flag the node; if false, unflag.
		 * @plugin flagnode
		 * @trigger flagnode.jstree
		 */
		this.flag_node = function (obj, should_flag) {
			if(should_flag==null) should_flag = true;		//undefined or null => set it
			if(!Array.isArray(obj)) {
				obj = [obj];
			}

			// Flag the nodes
			for(var obj_idx in obj) {
				var the_obj = obj[obj_idx];
				var the_node = this.get_node(the_obj, true);
				if(the_node === false) continue;
				setflagstate(this, the_node, should_flag);
			} //foreach node

			/**
			 * triggered after flagging
			 * @event
			 * @name flagnode.jstree
			 * @param {Array} res IDs of the flagged nodes
			 * @plugin flagnode
			 */
			this.trigger('flagnode',
					{ res : Object.keys(this._data.flagnode.flagged_nodes)});
		}; //flag()

		/**
		 * clear all flags
		 * @name clear_flags()
		 * @plugin flagnode
		 * @trigger clear_flagnode.jstree
		 */
		this.clear_flags = function () {
			var cls = this.settings.flagnode.css_class;
			$('.jstree-anchor.'+cls).removeClass(cls);
			this._data.flagnode.flagged_nodes = {};
			/**
			 * triggered after flags are cleared
			 * @event
			 * @name clear_flagnode.jstree
			 * @plugin flagnode
			 */
			this.trigger('clear_flagnode', {});
		};

		/// Redraw.
		/// @param {DOM object} obj The node being redrawn
		/// @return the object, if the parent was able to redraw it.
		this.redraw_node = function(obj, deep, callback, force_render) {
			obj = parent.redraw_node.apply(this, arguments);
			if(obj) {
				if(obj.id in this._data.flagnode.flagged_nodes) {
					setflagstate(this, $(obj), true);
				}
			}
			return obj;
		}; //redraw_node
	}; //flagnode plugin

}));
