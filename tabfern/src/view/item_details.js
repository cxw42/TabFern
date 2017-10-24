// view/item_details.js: Detail records and related utilities for
// TabFern items.
// Copyright (c) 2017 Chris White, Jasmine Hegman.

(function (root, factory) {
    let imports=['jquery','jstree','loglevel', 'multidex', 'view/const' ];

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
        root.tabfern_item_details = factory(...requirements);
    }
}(this, function ($, _unused_jstree_placeholder_, log, multidex, K ) {
    "use strict";

    function loginfo(...args) { log.info('TabFern view/item_details.js: ', ...args); };

    /// The module we are creating
    let module = {};

    /// Map between open-tab IDs and node IDs
    module.tabs = multidex(
        K.IT_TAB, //type
        [ //keys
            'tab_id',   // from Chrome
            'node_id',  // from jstree
        ],
        [ //other data
            'win_id',       // from Chrome
            'index',        // in the current window
            'tab',          // the actual Tab record from Chrome
            'being_opened', // true if we are manually opening the Chrome tab
            'raw_url',      // the tab's URL
            'raw_title',    // the tab's title.  null => default.
            'isOpen',       // open or not
            // TODO save favIconUrl?
            'raw_bullet',   // User-provided descriptive text (brief).
                            // null => none.
                            // It's not called a "note" because we may
                            // someday add a long-form notes field.
        ]);

    /// Map between open-window IDs and node IDs
    module.windows = multidex(
        K.IT_WIN,  //type
        [ //keys
            'win_id',   // from Chrome
            'node_id',  // from jstree
        ],
        [ //other data
            'win',          // the actual Window record from chrome
            'raw_title',    // the window's title (e.g., "Window")
            'isOpen',       // whether the window is open or not
            'keep',         // whether the window should be saved or not
            'raw_bullet',   // User-provided text (brief).  null => none
        ]);

    /// Find a node's value in the model, regardless of type.
    /// @param node_id {string} The node ID.  This has to be a string, because
    ///                         this module does not depend on item_tree.
    /// @return ret {object} the value, or ===false if the node wasn't found.
    ///                         val.ty holds the type.
    module.val_by_node_id = function(node_id)
    {
        if(typeof node_id !== 'string') return false;

        // Check each piece of the model in turn
        let val;
        val = module.windows.by_node_id(node_id);
        if(val) return val;

        val = module.tabs.by_node_id(node_id);
        if(val) return val;

        return false;   //not found
    } //val_by_node_id

    return module;
}));

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
