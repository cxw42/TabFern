// view/item_tree.js: Item tree view and related utilities for TabFern
// Copyright (c) 2017 Chris White, Jasmine Hegman.

(function (root, factory) {
    let imports=['jquery','jstree','jstree-actions', 'jstree-flagnode',
                    'jstree-because', 'loglevel', 'view/const',
                    'jstree-multitype', 'jstree-redraw-event' ];

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
}(this, function ($, _jstree, _actions, _flagnode, _because, log_orig, K, multitype ) {
    "use strict";

    function loginfo(...args) { log_orig.info('TabFern view/item_tree.js: ', ...args); };

    /// The module we are creating
    let module = {
        treeobj: null,      ///< The jstree instance
        invoked: false,     ///< A flag set by module.invoke()
    };

    // --- Scrolling support ---
//
//    // When scrolling, with the CSS I am using, actions do not scroll with the
//    // tree.  TODO figure out how to handle this more effectively.  Maybe
//    // float, now that we have an action group?
//
//    /// A scroll function to make sure the action-group divs stay
//    /// in the right place.  Inspired by
//    /// https://stackoverflow.com/a/16248243/2877364 by
//    /// https://stackoverflow.com/users/939547/jsarma
//    module.vscroll_function = function()
//    { //TODO make this a closure over a specific win, jq
//        //if(getBoolSetting(CFG_HIDE_HORIZONTAL_SCROLLBARS)) return;
//
//        // TODO? If we have been called from redraw.jstree, check the reason.
//        // If it was a move_node within a specific parent, only redo the
//        // scrolls for that parent?
//
//        // TODO? Keep a list of the current action groups, updated when
//        // the tree changes (or open_node/close_node) so we don't have
//        // to do $() here?
//
//        // Better yet --- use position:absolute with
//        // https://stackoverflow.com/a/20888342/2877364
//
//        //log.info('Updating V positions');
//        let scrolltop = $(window).scrollTop();
//        $('.' + K.ACTION_GROUP_WIN_CLASS).each(function(idx, dom_elem) {
//            let jq = $(dom_elem);
//            jq.css('top',jq.parent().offset().top - scrolltop);
//        });
//    } //vscroll_function

    /// The most recently seen right edge
    module.last_r_edge = undefined;

    /// Inner function to set #jq's css('right') to line up with #r_edge,
    /// given the same assumptions as rjustify_action_group_at() below.
    /// For speed, assumes jq.length > 0.
    function rjustify_inner(jq, r_edge) {
        // Get the position with right:0 in force.  This is the native
        // position, to which specifications of right: are negative.
        // TODO? memoize this?
        jq.css('right',0);
        let orig_left = jq.offset().left;

        // Move the box to where it should be.
        jq.css( 'right', 0 - (r_edge - jq.outerWidth() - orig_left) );
            // right: has to be negative to move the box to the right.
    } //rjustify_inner

    /// Set the css('right') to line up with last_r_edge for the
    /// action group under #node_dom_elem, given the same assumptions
    /// as rjustify_action_group_at() below.
    /// Takes an #idx_unused parameter so it can be called from $().each().
    module.rjustify_node_actions = function(idx_unused, node_dom_elem) {
        if(arguments.length === 1) node_dom_elem = idx_unused;
        let jq;
        // TODO? use treeobj.get_node instead?

        // If we were called directly from an after_open handler, we
        // have event data in node_dom_elem.  Unpack it.
        if(node_dom_elem && typeof node_dom_elem === 'object' &&
                    node_dom_elem.node && node_dom_elem.node.id) {
            node_dom_elem = node_dom_elem.node.id;
        }

        if(typeof node_dom_elem === 'string') {
            node_dom_elem = '#' + node_dom_elem;
        }

        jq = $('> div > .' + K.ACTION_GROUP_WIN_CLASS, node_dom_elem);

        if(jq.length) {     // Do this node
            rjustify_inner(jq, module.last_r_edge);
        }

        // Do this node's children, if any.  They appear not to always be
        // included in the list of nodes provided to the redraw.jstree event
        $('li.jstree-node',node_dom_elem).each(module.rjustify_node_actions);
    } //rjustify_node_actions

    /// Set each action group's css('right') to line up with the right
    /// edge at #rt, assuming position:relative with right: specified,
    /// and with left: not specified.  ** NOTE ** assumes LTR.
    /// TODO support RTL
    module.rjustify_action_group_at = function(r_edge) {

        // When called from an open or close action, r_edge will actually
        // be an event, and we will have a second argument holding
        // {node, instance}.  Use the saved edge, if we have one.
        if(typeof r_edge !== 'number') r_edge = module.last_r_edge;
        if(typeof r_edge !== 'number') return;

        module.last_r_edge = r_edge;

        // TODO if it's an after_open or after_close, only process nodes
        // from that node to the bottom of the tree.
        $('.' + K.ACTION_GROUP_WIN_CLASS).each(function(idx, dom_elem) {
            rjustify_inner($(dom_elem), r_edge);
        });
    } //rjustify_action_group_at

    // TODO change this to Hscroll calling rjustify

//    /// Update only once per frame when scrolling - Suggested by MDN -
//    /// https://developer.mozilla.org/en-US/docs/Web/Events/scroll#Example
//    ///
//    /// Maybe a bit better, but not great --- maybe try
//    /// https://stackoverflow.com/a/3701328/2877364 by
//    /// https://stackoverflow.com/users/124238/stephan-muller
//    let onscroll_handler = (function(){
//        let pending = false;
//
//        function onframe() {
//            module.vscroll_function();
//            pending = false;
//        }
//
//        return function onscroll(){
//            if(!pending) window.requestAnimationFrame(onframe);
//            pending = true;
//        }
//    })();
//
//    /// Set up the vscroll function to be called when appropriate.
//    /// @param win {DOM Window} window
//    /// @param jq_tree {JQuery element} the jQuery element for the tree root
//    module.install_vscroll_function = function(win, jq_tree)
//    {
//        if(getBoolSetting(CFG_HIDE_HORIZONTAL_SCROLLBARS)) return;
//            // Don't need this with absolute positions
//
//        // Need to update when scrolling because the action-group divs
//        // are fixed rather than absolute :( .
//        // TODO make them absolute, and no scroll handler, when the
//        // H scrollbar is hidden.
//        $(win).scroll(onscroll_handler);
//
//        // We also have to reset the positions on tree redraw.  Ugly.
//        jq_tree.on('redraw.jstree', module.vscroll_function);
//        jq_tree.on('after_open.jstree', module.vscroll_function);
//        jq_tree.on('after_close.jstree', module.vscroll_function);
//    }; //install_vscroll_function()

    // Trying it a different way --- resize detection modified from
    // https://stackoverflow.com/a/22571956/2877364 by
    // https://stackoverflow.com/users/95733/commonpike , based on
    // https://stackoverflow.com/a/20888342/2877364 and
    // https://gist.github.com/OrganicPanda/8222636 by
    // https://stackoverflow.com/users/178959/organicpanda
    //
    // This is nice because it will also trigger when the V scrollbar
    // appears or disappears.

    module.install_resize_detector = function(win, jq_tree){
        let jq_iframe = $('<iframe id="scrollbar-listener"/>');
        jq_iframe.css({
            'position'      : 'fixed',
            'width'         : '100%',
            'height'        : 0,
            'bottom'        : 0,
            'border'        : 0,
            'background-color'  : 'transparent'
        }).on('load',function() {
            //var vsb     = (document.body.scrollHeight > document.body.clientHeight);
            var timer   = null;
            var iframe = this;

            // Trigger once on startup so the action groups can be positioned
            // properly
            $(win).trigger('inner_resize',[iframe.clientWidth]);

            // Trigger whenever the size of the iframe changes
            this.contentWindow.addEventListener('resize', function() {
                clearTimeout(timer);
                timer = setTimeout(function() {
                    $(win).trigger('inner_resize',[iframe.clientWidth]);
                    //var vsbnew = (document.body.scrollHeight > document.body.clientHeight);
                    //if (vsbnew) {
                    //    if (!vsb) {
                    //        $(top.window).trigger('scrollbar',[true]);
                    //        vsb=true;
                    //    }
                    //} else {
                    //    if (vsb) {
                    //        $(top.window).trigger('scrollbar',[false]);
                    //        vsb=false;
                    //    }
                    //}
                }, 50);
            });

        }).appendTo('body');

        //Do we need these?

        // We also need this on redraw.jstree, but I am going to add that
        // later, in tree.js, after we've loaded the tree initially.
        // jq_tree.on('redraw.jstree', module.rjustify_action_group_at);
        // Same deal with redraw_event.jstree.
        jq_tree.on('after_open.jstree', module.rjustify_node_actions);

        //jq_tree.on('after_close.jstree', module.rjustify_action_group_at);
    }; //install_resize_detector

    // CSS classes
    const WIN_CLASS = 'tf-window'; // class on all <li>s representing windows
    const TAB_CLASS = 'tf-tab';    // class on all <li>s representing tabs
    const OPEN_CLASS = 'tfs-open';
    const SAVED_CLASS = 'tfs-saved';
    const RECOVERED_CLASS = 'tfs-recovered';
    const TOP_BORDER_CLASS = 'tfs-top-bordered';

    /// Create the tree.
    /// @param selector {JQuery selector} where to make the tree
    /// @param check_callback {function}
    /// @param is_draggable {function}
    /// @param contextmenu_items {function} If truthy, show a context menu
    module.create = function(selector, check_callback, is_draggable,
                                contextmenu_items)
    {
        // Node types - use constants as the keys
        let jstreeTypes = {};

        jstreeTypes[K.IT_WIN] = {
            li_attr: { 'class': WIN_CLASS },
            icon: 'clear-icon',  // We will overlay the actual icon in the CSS
        };

        jstreeTypes[K.NST_OPEN] = { li_attr: { 'class': OPEN_CLASS } };
        jstreeTypes[K.NST_SAVED] = { li_attr: { 'class': SAVED_CLASS } };
        jstreeTypes[K.NST_RECOVERED] = { li_attr: { 'class': RECOVERED_CLASS } };
        jstreeTypes[K.NST_TOP_BORDER] = { li_attr: { 'class': TOP_BORDER_CLASS } };

//        jstreeTypes[K.NT_WIN_EPHEMERAL] = {
//            li_attr: { class: K.WIN_CLASS + ' ' + K.VISIBLE_WIN_CLASS },
//            icon: 'visible-window-icon',
//        };
//
//        jstreeTypes[K.NT_WIN_ELVISH] = {
//            li_attr: { class: K.WIN_CLASS + ' ' + K.VISIBLE_WIN_CLASS },
//            icon: 'visible-saved-window-icon',
//        };
//
//        jstreeTypes[K.NT_RECOVERED] = {
//            li_attr: { class: K.WIN_CLASS + ' ' + K.CLASS_RECOVERED },
//            icon: true,     //default - folder
//        };

        jstreeTypes[K.IT_TAB] = {
            li_attr: { 'class': TAB_CLASS },
            icon: 'fff-page',   // per-node icons will override this
        };

//        jstreeTypes[K.NT_TAB_DORMANT] = {
//            li_attr: { class: K.TAB_CLASS },
//            icon: 'fff-page',   // per-node icons will override this
//        };
//
//        jstreeTypes[K.NT_TAB_OPEN] = {
//            li_attr: { class: K.TAB_CLASS },
//            icon: 'fff-page',   // per-node icons will override this
//        };

        // The main config
        let jstreeConfig = {
            plugins: ['because', 'wholerow', 'actions',
                        // actions must be after wholerow since we attach the
                        // action buttons to the wholerow div
                        'dnd', 'multitype', 'flagnode',
                        // flagnode must be after multitype - TODO update flagnode
                     ], // TODO add state plugin
            core: {
                animation: false,
                multiple: false,          // for now
                //check_callback added below if provided
                themes: {
                    name: 'default-dark',
                    variant: 'small',
                },
            },
            state: {
                key: 'tabfern-jstree'
            },
            flagnode: {
                css_class: 'tf-focused'
            },
            dnd: {
                copy: false,
                drag_selection: false,  // only drag one node
                //is_draggable added below if provided
                large_drop_target: true
                //, use_html5: true     // Didn't work in my testing
                //, check_while_dragging: false   // For debugging only
            },
            multitype: jstreeTypes,
            actions: {
                propagation: 'stop'
                    // clicks on action buttons don't also go to any other elements
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

        // This is always the last plugin
        jstreeConfig.plugins.push('redraw_event');

        // Create the tree
        let jq_tree = $(selector);
        module.treeobj = jq_tree.jstree(jstreeConfig).jstree(true);

        // wholerow hides the dots on ready.jstree and set_state.jstree.
        // Show them again.
        if(getBoolSetting(CFG_SHOW_TREE_LINES)) {
            jq_tree.on('ready.jstree set_state.jstree', ()=>{
                module.treeobj.show_dots();
            });
            module.treeobj.show_dots();     // in case of a race with
        }                                   // those events.

        // Add custom event handlers
        //module.install_vscroll_function(window, jq_tree);
        module.install_resize_detector(window, jq_tree);

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
