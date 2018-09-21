/**
 * ### Flagnode plugin
 *
 * Adds to jsTree the ability to highlight nodes, independently of what's
 * selected.
 *
 * If loaded after the `types` plugin, can also flag by type.
 *
 * Modified from jstree.search.js.
 */
/*globals jQuery, define, exports, require, document */
(function (factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define('jstree-flagnode',['jquery','jstree'], factory);
    }
    else if(typeof exports === 'object') {
        factory(require('jquery'), require('lib/jstree'));
    }
    else {
        factory(jQuery, jQuery.jstree);
    }
}(function ($, _jstree_unused, undefined) {
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
        this._data.flagnode.flagged_nodes={};	//map node IDs to true.
            // It's a hash so we can add and delete in O(1).

        /// Helper to convert [$(), $(), $()] to $(a,b,c)
        /// From https://stackoverflow.com/a/6867350/2877364 by
        /// https://stackoverflow.com/users/331508/brock-adams
        function arrjq_to_jqarr(arr) {
            return $(arr).map(function(){ return this.toArray(); } );
        };

        /**
         * Helper to set the flag state on a node
         * @param {jQuery} jq_node The jQuery node(s) to adjust, if any
         * @param {Boolean} should_flag Whether to set or clear the flag
         */
        this._setflagstate = function(jq_node, should_flag)
        {
            let self = this;
            let cls = this.settings.flagnode.css_class;

            if(Array.isArray(jq_node)) {
                jq_node = arrjq_to_jqarr(jq_node);
            }

            if(should_flag) {
                jq_node.children('.jstree-anchor').addClass(cls);
                jq_node.each(function(unused,elem){
                    self._data.flagnode.flagged_nodes[elem.id] = true;
                });
            } else {
                jq_node.children('.jstree-anchor').removeClass(cls);
                jq_node.each(function(unused,elem){
                    delete self._data.flagnode.flagged_nodes[elem.id];
                });
            }
        } //_setflagstate()

        /**
         * flag or unflag a given node
         * @name flag_node(obj [, should_flag])
         * @param {mixed} obj the node to flag, or an array of nodes to flag
         * @param {Boolean} should_flag (default true) if true, flag the node; if false, unflag.
         * @param {Boolean} suppress_event If true, don't trigger an event
         * @plugin flagnode
         * @trigger flagnode.jstree
         */
        this.flag_node = function (obj, should_flag, suppress_event) {
            if(should_flag==null) should_flag = true;		//undefined or null => set it
            if(!Array.isArray(obj)) {
                obj = [obj];
            }

            // Flag the nodes
            let to_flag = [];
            for(var obj_idx in obj) {
                var the_obj = obj[obj_idx];
                var the_node = this.get_node(the_obj, true);
                if(the_node === false) continue;
                to_flag.push(the_node);
            } //foreach node
            this._setflagstate(to_flag, should_flag);

            /**
             * triggered after flagging
             * @event
             * @name flagnode.jstree
             * @param {Array} flagged IDs of the flagged nodes
             * @plugin flagnode
             */
            if(!suppress_event) {
                this.trigger('flagnode',
                        { flagged :
                            Object.keys(this._data.flagnode.flagged_nodes)}
                );
            }
        }; //flag()

        /**
         * clear all flags
         * @name clear_flags()
         * @param {Boolean} suppress_event If true, don't trigger an event
         * @plugin flagnode
         * @trigger clear_flagnode.jstree
         */
        this.clear_flags = function (suppress_event) {
            var cls = this.settings.flagnode.css_class;
            this.element.find('.jstree-anchor.'+cls).removeClass(cls);
            this._data.flagnode.flagged_nodes = {};
            /**
             * triggered after flags are cleared
             * @event
             * @name clear_flagnode.jstree
             * @plugin flagnode
             */
            if(!suppress_event) {
                this.trigger('clear_flagnode', {flagged:[]});
            }
        };

        /// Redraw.
        /// @param {DOM object} obj The node being redrawn
        /// @return the object, if the parent was able to redraw it.
        this.redraw_node = function(obj, deep, callback, force_render) {
            obj = parent.redraw_node.apply(this, arguments);
            if(obj) {
                if(obj.id in this._data.flagnode.flagged_nodes) {
                    this._setflagstate($(obj), true);
                }
            }
            return obj;
        }; //redraw_node

        // === Type support ===

        // If the "types" plugin isn't loaded, don't create the functions that require it
        if($.jstree.plugins.types && (this instanceof $.jstree.plugins.types)) {

            /**
             * clear flags on all nodes of a specific type
             * @name clear_flags_by_type()
             * @param {mixed} type The type of node (other types won't be affected).
             *						Pass an array for multiple types.
             * @param except_parent_node_id If present, only clear nodes that are
             * 						are not children of #except_parent_node_id.
             * 						TODO refactor this into a general clear
             * 						function that will take an object of criteria.
             * @param {Boolean} suppress_event If true, don't trigger an event
             * @plugin flagnode
             * @trigger clear_flagnode.jstree
             */
            this.clear_flags_by_type = function(type, except_parent_node_id,
                                                suppress_event) {
                if(!Array.isArray(type)) type = [type];

                // Collect the nodes
                let nodes_to_clear = [];
                for(let node_id in this._data.flagnode.flagged_nodes) {
                    let jstree_node = this.get_node(node_id);

                    if(!type.includes(jstree_node.type)) continue;
                    if(except_parent_node_id &&
                            jstree_node.parent === except_parent_node_id) continue;

                    nodes_to_clear.push(this.get_node(node_id,true));
                }
                this._setflagstate(nodes_to_clear, false);

                if(!suppress_event) {
                    this.trigger('clear_flagnode',
                        { 	flagged: Object.keys(this._data.flagnode.flagged_nodes),
                            cleared_except_parent_node_id: except_parent_node_id,
                            cleared_type: type,
                        }
                    );
                }
            }; //clear_flags_by_type
        } //endif "types" plugin loaded

        // If the "multitype" plugin isn't loaded, don't create the functions that require it
        if($.jstree.plugins.multitype && (this instanceof $.jstree.plugins.multitype)) {

            /**
             * clear flags on all nodes having a specific multitype
             * @name clear_flags_by_type()
             * @param {mixed} type The type of node (other types won't be affected).
             *						Pass an array for multiple types; only nodes
             *						having all those types will be affected.
             * @param except_parent_node_id If present, only clear nodes that are
             * 						are not children of #except_parent_node_id.
             * 						TODO refactor this into a general clear
             * 						function that will take an object of criteria.
             * @param {Boolean} suppress_event If true, don't trigger an event
             * @plugin flagnode
             * @trigger clear_flagnode.jstree
             */
            this.clear_flags_by_multitype = function(type, except_parent_node_id,
                                                suppress_event) {
                if(!Array.isArray(type)) type = [type];

                // Collect the nodes
                let nodes_to_clear = [];
                NODE: for(let node_id in this._data.flagnode.flagged_nodes) {
                    let jstree_node = this.get_node(node_id);

                    for(let ty of type) {	// check each multitype
                        if(!this.has_multitype(jstree_node, ty)) continue NODE;
                    }

                    if(except_parent_node_id &&
                            jstree_node.parent === except_parent_node_id) continue;

                    nodes_to_clear.push(this.get_node(node_id,true));
                }

                this._setflagstate(nodes_to_clear, false);

                if(!suppress_event) {
                    this.trigger('clear_flagnode',
                        { 	flagged: Object.keys(this._data.flagnode.flagged_nodes),
                            cleared_except_parent_node_id: except_parent_node_id,
                            cleared_type: type,
                        }
                    );
                }
            }; //clear_flags_by_type
        } //endif "multitype" plugin loaded

    }; //flagnode plugin

}));
// vi: set ts=4 sw=4: //
