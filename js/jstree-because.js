/**
 * ### Because plugin
 *
 * This plugin adds more information to any event. The new data is
 * specified by a call to `because()` wrapping the actual call.  For example:
 *
 *     because({answer:42}, 'move_node', 'j2_1', 'j2_2');
 *
 * will cause the `move_node.jstree` triggered by the `move_node` call to
 * include `because:{answer:42}` in the event data.  The reason can be anything
 * except `undefined`.
 */
/*globals jQuery, define, exports, require, document */
(function (factory) {
	"use strict";
	if (typeof define === 'function' && define.amd) {
		define(['jquery','jstree'], factory);
	}
	else if(typeof exports === 'object') {
		factory(require('jquery'), require('jstree'));
	}
	else {
		factory(jQuery, jQuery.jstree);
	}
}(function ($, _jstree_unused, undefined) {
	"use strict";

	if($.jstree.plugins.because) { return; }

	$.jstree.plugins.because = function (options, parent) {
		this._data.because = {reason: undefined};

		this.because = function(reason, function_name, ...args) {
			this._data.because.reason = reason;
			this[function_name](...args);
			this._data.because.reason = undefined;
		}; //because

		this.trigger = function (ev, data) {
			if(!data) {
				data = {};
			}

			if(this._data.because.reason !== undefined) {	// Inject the reason
				data.because = this._data.because.reason;
			}

			parent.trigger.call(this, ev, data);
		}; //trigger()
	};
}));

// vi: set ts=4 sw=4 ai: //
