/**
 * ### Because plugin
 *
 * This plugin adds more information to any event. The new data is
 * specified by a call to `because()` wrapping the actual call.  For example:
 *
 *     because({answer:42}, 'move_node', 'j2_1', 'j2_2');
 *
 * will cause the `move_node.jstree` triggered by the `move_node` call to
 * include `reason:{answer:42}` in the event data.  The reason can be anything
 * except `undefined`.
 */
/*globals jQuery, define, exports, require, document */
(function (factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define('jstree-because',['jquery','jstree'], factory);
    }
    else if(typeof exports === 'object') {
        factory(require('jquery'), require('lib/jstree'));
    }
    else {
        factory(jQuery, jQuery.jstree);
    }
}(function ($, _jstree_unused, undefined) {
    "use strict";

    if($.jstree.plugins.because) { return; }

    $.jstree.plugins.because = function (options, parent) {
        this._data.because = {reason: undefined};

        /// Call a jstree function, with the provided reason available
        this.because = function(reason, function_name, ...args) {
            this._data.because.reason = reason;
            this[function_name](...args);
            this._data.because.reason = undefined;
        }; //because

        /// Incorporate the reason (if any) into an event
        this.trigger = function (ev, data) {
            if(!data) data = {};

            if(this._data.because.reason !== undefined) {	// Inject the reason
                data.reason = this._data.because.reason;
            }

            parent.trigger.call(this, ev, data);
        }; //trigger()

        /// Accessor for the check callback or other functions that may be
        /// called during a because() call.
        this.reason = function() {
            return this._data.because.reason;
        }; //reason()
    };
}));

// vi: set ts=4 sw=4 ai: //
