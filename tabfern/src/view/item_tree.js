// view/item_tree.js: Item tree view and related utilities for TabFern
// Copyright (c) 2017 Chris White, Jasmine Hegman.

(function (root, factory) {
    let imports=['jquery','jstree','jstree-actions', 'jstree-flagnode',
                    'jstree-because', 'loglevel', 'view/const',
                    'jstree-flavors' ];

    if (typeof define === 'function' && define.amd) {
        // AMD
        define(imports, factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        let requirements = [];
        for(let modulename of imports) {
            requirements.push(require(modulename));
        }
        module.exports = factory(...requirements);
    } else {
        // Browser globals (root is `window`)
        let requirements = [];
        for(let modulename of imports) {
            requirements.push(root[modulename]);
        }
        root.tabfern_item_tree = factory(...requirements);
    }
}(this, function ($, _jstree, _actions, _flagnode, _because, log_orig, K, flavors ) {
    "use strict";

    function loginfo(...args) { log_orig.info('TabFern view/item_tree.js: ', ...args); };

    /// The module we are creating
    let module = {
        treeobj: null,      ///< The jstree instance
        invoked: false,     ///< A flag set by module.invoke()
    };

    // --- Vertical-scrolling support ---

    // When scrolling, with the CSS I am using, actions do not scroll with the
    // tree.  TODO figure out how to handle this more effectively.  Maybe
    // float, now that we have an action group?

    /// A scroll function to make sure the action-group divs stay
    /// in the right place.  Inspired by
    /// https://stackoverflow.com/a/16248243/2877364 by
    /// https://stackoverflow.com/users/939547/jsarma
    module.vscroll_function = function()
    { //TODO make this a closure over a specific win, jq
        //log.info('Updating V positions');
        let scrolltop = $(window).scrollTop();
        $('.' + K.ACTION_GROUP_WIN_CLASS).each(function(idx, dom_elem) {
            let jq = $(dom_elem);
            jq.css('top',jq.parent().offset().top - scrolltop);
        });
    } //vscroll_function

    /// Update only once per frame when scrolling - Suggested by MDN -
    /// https://developer.mozilla.org/en-US/docs/Web/Events/scroll#Example
    ///
    /// Maybe a bit better, but not great --- maybe try
    /// https://stackoverflow.com/a/3701328/2877364 by
    /// https://stackoverflow.com/users/124238/stephan-muller
    let onscroll_handler = (function(){
        let pending = false;

        function onframe() {
            module.vscroll_function();
            pending = false;
        }

        return function onscroll(){
            if(!pending) window.requestAnimationFrame(onframe);
            pending = true;
        }
    })();

    /// Set up the vscroll function to be called when appropriate.
    /// @param win {DOM Window} window
    /// @param jq_tree {JQuery element} the jQuery element for the tree root
    module.install_vscroll_function = function(win, jq_tree)
    {
        // Need to update when scrolling because the action-group divs
        // are fixed rather than absolute :( .
        // TODO make them absolute, and no scroll handler, when the
        // H scrollbar is hidden.
        $(win).scroll(onscroll_handler);

        // We also have to reset the positions on tree redraw.  Ugly.
        jq_tree.on('redraw.jstree', module.vscroll_function);
        jq_tree.on('after_open.jstree', module.vscroll_function);
        jq_tree.on('after_close.jstree', module.vscroll_function);
    }; //install_vscroll_function()

    /// Create the tree.
    /// @param selector {JQuery selector} where to make the tree
    /// @param check_callback {function}
    /// @param is_draggable {function}
    /// @param contextmenu_items {function} If truthy, show a context menu
    module.create = function(selector, check_callback, is_draggable,
                                contextmenu_items, flavor_callback)
    {
        // Node types - use constants as the keys
        let jstreeTypes = {};

        jstreeTypes[K.NT_WIN_DORMANT] = {
            li_attr: { class: K.WIN_CLASS },
            icon: true,     //default - folder
        };

        jstreeTypes[K.NT_WIN_EPHEMERAL] = {
            li_attr: { class: K.WIN_CLASS + ' ' + K.VISIBLE_WIN_CLASS },
            icon: 'visible-window-icon',
        };

        jstreeTypes[K.NT_WIN_ELVISH] = {
            li_attr: { class: K.WIN_CLASS + ' ' + K.VISIBLE_WIN_CLASS },
            icon: 'visible-saved-window-icon',
        };

        jstreeTypes[K.NT_RECOVERED] = {
            li_attr: { class: K.WIN_CLASS + ' ' + K.CLASS_RECOVERED },
            icon: true,     //default - folder
        };

        jstreeTypes[K.NT_TAB] = {
            li_attr: { class: K.TAB_CLASS },
            icon: 'fff-page',   // per-node icons will override this
        };

//        jstreeTypes[K.NT_TAB_BORDERED] = {
//            li_attr: { class: K.TAB_CLASS + ' ' + K.BORDERED_TAB_CLASS },
//            icon: 'fff-page',   // per-node icons will override this
//        };

        jstreeTypes[K.NT_TAB_DORMANT] = {
            li_attr: { class: K.TAB_CLASS },
            icon: 'fff-page',   // per-node icons will override this
        };

        jstreeTypes[K.NT_TAB_OPEN] = {
            li_attr: { class: K.TAB_CLASS },
            icon: 'fff-page',   // per-node icons will override this
        };

        // The main config
        let jstreeConfig = {
            plugins: ['because', 'wholerow', 'actions',
                        // actions must be after wholerow since we attach the
                        // action buttons to the wholerow div
                        'dnd', 'types', 'flagnode',
                        // flagnode must be after types
                        'flavors',
                     ], // TODO add state plugin
            core: {
                animation: false,
                multiple: false,          // for now
                //check_callback added below if provided
                themes: {
                    name: 'default-dark'
                  , variant: 'small'
                }
            },
            state: {
                key: 'tabfern-jstree'
            },
            flagnode: {
                css_class: 'tf-focused-tab'
            },
            dnd: {
                copy: false,
                drag_selection: false,  // only drag one node
                //is_draggable added below if provided
                large_drop_target: true
                //, use_html5: true     // Didn't work in my testing
                //, check_while_dragging: false   // For debugging only
            },
            types: jstreeTypes,
            actions: {
                propagation: 'stop'
                    // clicks on action buttons don't also go to any other elements
            },
            flavors: {
                callback: flavor_callback,
            },
        };

        // Note on dnd.use_html5: When it's set, if you drag a non-draggable item,
        // it seems to treat the drag as if you were dragging the last node
        // you successfully dragged.
        // The effect of this is that, e.g., after dragging a window, dragging
        // one of its children moves the whole window.  TODO report this upstream.

        if(check_callback) jstreeConfig.core.check_callback = check_callback;
        if(is_draggable) jstreeConfig.dnd.is_draggable = is_draggable;

        if(contextmenu_items) {
            jstreeConfig.plugins.push('contextmenu');
            jstreeConfig.contextmenu = {
                items: contextmenu_items
            };
            $.jstree.defaults.contextmenu.select_node = false;
            $.jstree.defaults.contextmenu.show_at_node = false;
        }

        // Create the tree
        let jq_tree = $(selector);
        jq_tree.jstree(jstreeConfig);
        module.treeobj = jq_tree.jstree(true);

        // Add custom event handlers
        module.install_vscroll_function(window, jq_tree);

        // Add a spare node that will be hidden and that will serve as a
        // holding pen when tabs are being attached and detached.
        module.holding_node_id = module.treeobj.create_node(
                $.jstree.root,
                {   id: 'ord',
                    text: '** Holding pen',
                    state:  { hidden: true },
                    data: { skip: true },
                        // Skip this window while processing, unless you're
                        // expressly looking for it.  Skipped nodes should
                        // be kept at the top, just for regularity.
                });

        // TODO move this to a constructor so you can create multiple,
        // separate treeobjs.
        // TODO? make treeobj the prototype of module?  Then, e.g., T.get_node
        // would work, and you wouldn't have to say T.treeobj.get_node.
        // Or maybe make vscroll a jstree plugin?

    }; //module.create()

    /// Invoke a function on T.treeobj, setting a flag before and clearing it
    /// after.  This is so a synchronous callback (e.g., check()) can tell
    /// that it was called as a result of an invoke().
    module.invoke = function(which, ...args) {
        module.invoked = true;
        which(...args);
        module.invoked = false;
    }; //module.invoke()

    return module;
}));

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
