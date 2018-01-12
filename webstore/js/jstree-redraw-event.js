/**
 * ### Redraw-event plugin
 *
 * This plugin triggers a "redraw_event" event on redraw.  List it last
 * in the plugin chain, and you will reliably get an event every time
 * a node is redrawn.
 * The event gets an {obj} parameter listing the object that was just redrawn.
 */
/*globals jQuery, define, exports, require, document */
(function (factory) {
	"use strict";
	if (typeof define === 'function' && define.amd) {
		define('jstree-redraw-event',['jquery','jstree'], factory);
	}
	else if(typeof exports === 'object') {
		factory(require('jquery'), require('jstree'));
	}
	else {
		factory(jQuery, jQuery.jstree);
	}
}(function ($, _jstree_unused, undefined) {
	"use strict";

	if($.jstree.plugins.redraw_event) { return; }

	$.jstree.plugins.redraw_event = function (options, parent) {
		//this._data.redraw_event = {reason: undefined};

		/// Redraw.
		/// @param {DOM object} obj The node being redrawn
		/// @return the object, if the parent was able to redraw it.
		this.redraw_node = function(obj, deep, callback, force_render) {
			obj = parent.redraw_node.apply(this, arguments);
			this.trigger('redraw_event', {obj: obj});
			return obj;
		}; //redraw_node

	};
}));

// vi: set ts=4 sw=4 ai: //
