(function (factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define('jstree-actions',['jquery', 'jstree'], factory);
    }
    else if(typeof module !== 'undefined' && module.exports) {
        module.exports = factory(require('jquery'), require('lib/jstree'));
    }
    else {
        factory(jQuery, jQuery.jstree);
    }
}(function ($, _jstree_unused, undefined) {
    "use strict";

    if($.jstree.plugins.actions) { return; }

    /**
     * stores all defaults for the actions plugin
     * @name $.jstree.defaults.actions
     * @plugin actions
     */
    $.jstree.defaults.actions = {
        /**
         * How event propagation should be controlled after a click
         * on an action button.
         *
         * - Set to `stop` to call `stopPropagation` after the callback
         * - Set to `immediate` to call `stopImmediatePropagation`
         *   after the callback
         * - Any other value (e.g., the default of `normal` will not
         *   change the propagation.
         *
         * @name $.jstree.defaults.actions.propagation
         * @plugin actions
         */
        propagation: 'normal'
    };

    $.jstree.plugins.actions = function (options, parent) {

        this._actions = {};         // indexed by node id
        this._group_parms = {};     // The parameters of the group divs, indexed by node id.

        /** Make a group to hold grouped actions.  Call this before calling add_action()
         * with grouped: true.
         * @param node_id  <- the ID of the pertinent node
         * @param opts     <- a structure with option fields.
         * @return the new group div's jquery object, or null
         *
         * possible opts are:
         * selector <- a selector that would specify where to insert the action. Note that this is a plain JavaScript selector and not a jQuery one.
         *              If selector is missing or falsy, the <li> of the item itself is used.
         * child    <- (bool) optional - if true, insert the action as a child of the element matching <selector>
         * after    <- (bool) insert the action after (true, default) or before (false) the element matching the <selector> key.  Ignored if <child> is true.
         * class    <- class(es) to apply to the new div
         * text     <- text to put in the new div
         */
        this.make_group = function (node_id, opts) {
            var after = (typeof opts.after == 'undefined') ? true : opts.after;
            if (typeof opts.selector == 'undefined') return null;   // TODO report error?

            // Note: when this is called, the DOM object may not yet exist.

            // Regularize and stash the parms
            var parms = this._group_parms[node_id] = Object.assign({}, opts);
            parms.class = parms.class || '';
            parms.text = parms.text || '';
            parms.selector = parms.selector || null;
                // any falsy value => null, for regularity and to permit
                // distinguishing undefined from null should you need to.
        }

        /** Add a DOM element based on the selector, child, and after options.
         * @param node_el {DOM Element} The root element of the node, generally <li>.
         *                              Must have non-null `parentNode`.
         * @param to_add_el {DOM Element} The element to add
         * @param opts {object} Where to add the element.  Has optional selector,
         *                      optional child, and optional after, as described
         *                      with reference to this._make_group().
         */
        this._add_dom_element = function(node_el, to_add_el, opts) {
            var place;
            if(opts.selector) {
                place = node_el.querySelector(opts.selector);
            } else {
                place = node_el;
            }

            if (opts.child) {
                place.appendChild(to_add_el);
            } else if (opts.after) {
                place.parentNode.insertBefore(to_add_el, place.nextSibling);
            } else { //before
                place.parentNode.insertBefore(to_add_el, place);
            }
        };

        /** Create the group div for a node.  Returns the DOM object, or null.
         * Uses the provided node_el because this.get_node(node_id, true)
         * doesn't always succeed during redraw.
         * @param node_id {string} The node
         * @param node_el {DOM element} The current element for this node.
         */
        this._create_group_for = function (node_id, node_el) {
            if(!(node_id in this._group_parms)) return null;    // TODO report error?

            var opts = this._group_parms[node_id];
            var group_el = document.createElement("div");
            group_el.className = opts.class;
            group_el.textContent = opts.text;

            this._add_dom_element(node_el, group_el, opts);

            return group_el;
        };

        /** Add an action to a node or node(s).
         * @param node_id Can be a single node id or an array of node ids.
         * @param action An object representing the action that should be added to <node>.
         *
         * The <node id> is the "id" key of each element of the "core.data" array.
         * A special value "all" is allowed, in which case the action will be added to all nodes.
         *
         * The action object can contain the following keys:
         * id       <- string An ID which identifies the action. The same ID can be shared across different nodes
         * text     <- string The action's text
         * html     <- string The action's html; used in preference to text if both are provided
         * class    <- string (a string containing all the classes you want to add to the action (space separated)
         * event    <- string The event on which the trigger will be called
         * callback <- function that will be called when the action is clicked
         * dataset  <- optional object of key-value pairs that will be added as
         *             data-* attributes of the action's element.  The values
         *             must be strings or support toString().
         *
         * The action object can contain one of two types of location information:
         * 1. grouped  <- (default false) if true, put this action in a div.  Call make_group() first to set up this div.  Actions are appended as children of the div.
         * 2.  If grouped is not true, the following can be used:
         *      selector <- a selector that would specify where to insert the action. Note that this is a plain JavaScript selector and not a jQuery one.
         *              If selector is missing or falsy, the <li> of the item itself is used.
         *      child    <- (bool) optional - if true, insert the action as a child of the element matching <selector>
         *      after    <- (bool) insert the action after (true, default) or before (false) the element matching the <selector> key.  Ignored if <child> is true.
         *
         * NOTES: Please keep in mind that:
         * - the id's are strictly compared (===)
         * - the selector has access to all children on nodes with leafs/children, so most probably you'd want to use :first or similar
         */
        this.add_action = function (node_id, action) {
            var self = this;
            node_id = typeof node_id === 'object' ? node_id : [node_id];

            for (var i = 0; i < node_id.length; i++) {
                var _node_id = node_id[i];
                var actions = self._actions[_node_id] = self._actions[_node_id] || [];

                var should_redraw = false;

                if (!self._has_action(_node_id, action.id)) {
                    if(action.grouped && !(_node_id in this._group_parms)) {
                        continue;   // TODO report error?
                    }

                    var the_action = Object.assign({}, action); //our own copy
                    the_action.selector = the_action.selector || null;
                    actions.push(the_action);
                    should_redraw = true;
                }

                if(should_redraw) this.redraw_node(_node_id);

            }
        };

        /**
         * @param node_id Can be a single node id or an array of node ids
         * @param action_id The ID of the action to be removed
         *
         * The <node id> is the "id" key of each element of the "core.data" array.
         * A special value "all" is allowed, in which case the action_id will be removed from all nodes.
         *
         * The action_id is the unique identifier for each action.
         * A special value "all" is allowed, in which case all the actions of node_id will be removed.
         */
        this.remove_action = function (node_id, action_id) {
            var self = this;
            var node_ids = typeof node_id === 'object' ? node_id :
                node_id === "all" ? Object.keys(this._actions).concat('all') :
                    [node_id];

            for (var i = 0; i < node_ids.length; i++) {
                node_id = node_ids[i];
                var actions = self._actions[node_id] || [];
                var new_actions = [];

                for (var j = 0; j < actions.length; j++) {
                    var action = actions[j];
                    if(action.id !== action_id && action_id !== "all") {
                        new_actions.push(action);
                    }
                }
                var ids = actions.map(function(x) { return x.id; });
                var new_ids = new_actions.map(function(x) { return x.id; });
                if (ids.length != new_ids.length || ids.filter(function(n) { return new_ids.indexOf(n) === -1; }).length) {
                    self._actions[node_id] = new_actions;
                    this.redraw_node(node_id);
                }
            }
        };

        /**
         * Create the element for an action button.
         * @param node_id {string} The node's ID
         * @param action_id {string} The action's ID
         */
        this._create_action = function (node_id, action_id) {
            var self = this;
            var action = this._get_action(node_id, action_id);
            if (action === null) return null;

            var action_el = document.createElement("i");
            action_el.className = action.class;
            if(action.html) {
                action_el.innerHTML = action.html;
            } else {
                action_el.textContent = action.text || '';
            }

            // Set up element data-* values, if any
            if( action_el.dataset && action.dataset &&
                (typeof action.dataset === 'object') &&
                (action.dataset !== null)
            ) {
                for(var key in action.dataset) {
                    action_el.dataset[key] = '' + action.dataset[key];
                }
            }

            // Title
            if(action.title) {
                action_el.title = action.title;
            }

            $(action_el).click(function(event) {
                var node = self.get_node(action_el);
                action.callback(node_id, node,
                    action_id, action_el, event);

                if(self.settings.actions.propagation==='stop') {
                    event.stopPropagation();
                } else if(self.settings.actions.propagation === 'immediate') {
                    event.stopImmediatePropagation();
                }
            });

            return {
                "action": action,
                "action_el": action_el
            };
        };

        /**
         * Find an action of a node.
         * @param node_id {string} The node's ID, or "all"
         * @param action_id {string} The action's ID
         * @return The action's data, or `null` if the action wasn't found.
         */
        this._get_action = function (node_id, action_id) {
            var actions = this._actions[node_id] || [];
            var v = null;
            for (var i = 0; i < actions.length; i++) {
                var action = actions[i];
                if (action.id === action_id) {
                    //TODO: fill empty fields with default values?
                    v = action;
                }
            }
            return v;
        };

        /**
         * Add the given action to the DOM.
         * @param node_el {DOM element} The node
         * @param action The action's data record, including the
         *                  already-created DOM element of the action button
         */
        this._set_action = function (node_el, action) {
            if (action === null) return;

            this._add_dom_element(node_el, action.action_el, action.action);
        };

        this._has_action = function (node_id, action_id) {
            var found = false;
            var actions = this._actions;

            if (actions.hasOwnProperty(node_id)) {
                for (var i = 0; i < actions[node_id].length; i++) {
                    if (actions[node_id][i].id === action_id) found = true;
                }
            }

            if (this._actions.hasOwnProperty('all')) {
                for (i = 0; i < actions['all'].length; i++) {
                    if (actions['all'][i].id === action_id) found = true;
                }
            }

            return found;
        };

        /**
         * @param obj The node to redraw
         */
        this.redraw_node = function (obj, deep, callback, force_draw) {
            var self = this;
            var node_id = typeof obj === "object" ? obj.id : obj;
            var node_el = parent.redraw_node.call(this, obj, deep, callback, force_draw);
            if (node_el) {
                //Check if we have any specific actions for this node
                var actions = this._actions[node_id] || [];
                var actions_all = this._actions["all"] || [];

                // Create the group if necessary
                var group_el;
                for (var i = 0; i < actions.length; i++) {
                    if(actions[i].grouped) {
                        group_el = this._create_group_for(node_id, node_el);
                        break;
                    }
                }

                for (var i = 0; (!group_el) && (i < actions_all.length); i++) {
                    if(actions_all[i].grouped) {
                        group_el = this._create_group_for(node_id, node_el);
                        break;
                    }
                }

                // Populate the actions
                for (var i = 0; i < actions.length; i++) {
                    if(actions[i].grouped && !group_el) {
                        //console.log('** Skipping action of node ' + node_id);
                        //console.log(actions[i]);
                        continue;
                    }
                    var _action = self._create_action(node_id, actions[i].id);

                    if(actions[i].grouped) {
                        group_el.appendChild(_action.action_el);
                    } else {    // not grouped
                        self._set_action(node_el, _action);
                    }
                }

                // Populate the "all" actions
                for (i = 0; i < actions_all.length; i++) {
                    if(actions[i].grouped && !group_el) {
                        //console.log('** Skipping "all" action at node ' + node_id);
                        //console.log(actions[i]);
                        continue;
                    }
                    _action = self._create_action("all", actions_all[i].id);

                    if(actions_all[i].grouped) {
                        group_el.appendChild(_action.action_el);
                    } else {    // not grouped
                        self._set_action(node_el, _action);
                    }
                }

            } //endif node_el
            return node_el;
        };

    }

}));
// vi: set ts=4 sts=4 sw=4 et ai: //
