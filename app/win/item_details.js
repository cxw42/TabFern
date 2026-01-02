// view/item_details.js: Detail records and related utilities for
// TabFern items.
// Note: the details do not include all the data.  Parent/child relationships between
// nodes, and top borders on items, are kept in the tree.
//
// Copyright (c) 2017 Chris White, Jasmine Hegman.
// Copyright (c) 2018--2020 Chris White

const $ = require("jquery");
require("lib/jstree");
const log = require("loglevel");
const multidex = require("lib/multidex");
const K = require("./const");

function loginfo(...args) {
    log.info("TabFern view/item_details.js: ", ...args);
}

// == Data structures ====================================================

// Design decisions for both tabs and windows:
// - No fields named `parent` so I can distinguish jstree node
//   records from multidex values.
// - No fields named `id` --- those exist in ctab and cwin records
// - All types of records have `raw_title` and `isOpen` fields.

/// Map between open-tab IDs and node IDs.
tabs = multidex(
    K.IT_TAB, //type
    [
        //keys
        "tab_id", // from Chrome
        "node_id", // from jstree
    ],
    [
        //other data
        "win_id", // from Chrome
        "index", // of the Chrome tab in its Chrome window
        "tab", // the actual Tab record from Chrome
        // TODO remove this --- tab_id should be enough
        // Or, if I keep it, at least rename it to `ctab` for consistency
        "being_opened", // true if we are manually opening the Chrome tab
        "raw_url", // the tab's URL
        "raw_title", // the tab's title.  null => default.
        "isOpen", // open or not
        "raw_bullet", // User-provided descriptive text (brief).
        // null => none.
        // It's not called a "note" because we may
        // someday add a long-form notes field.
        "raw_favicon_url", //favicon URL
        "isPinned", // whether the tab is pinned
        "isAudible", // whether the tab is playing audio
        // Note: MutedInfo not yet tracked.
        // Note: isTopBordered (NST_TOP_BORDER) is stored in the jstree,
        // not here.
    ]
);

/// Map between open-window IDs and node IDs.
/// Design decisions: see above
windows = multidex(
    K.IT_WIN, //type
    [
        //keys
        "win_id", // from Chrome
        "node_id", // from jstree
        "ordered_url_hash",
        // Hash of the URLs of its tabs, in order.  Used for
        // determining whether a window is open.  NOTE: if a user
        // opens two windows with exactly the same set of tabs,
        // whichever one already has that ordered_url_hash will keep it.
    ],
    [
        //other data
        "win", // the actual Window record from chrome
        // TODO? remove this --- win_id should be enough
        "raw_title", // the window's title (e.g., "Window")
        "isOpen", // whether the window is open or not
        "keep", // whether the window should be saved or not
        //'raw_bullet',   // User-provided text (brief).  null => none
        // Not currently used.
        "isClosing", // true if the window is currently being closed
        // by TF itself, as opposed to in response to
        // something done by the browser.
    ]
);

// == Functions ==========================================================

/// Find a node's value in the model, regardless of type.
/// @param node_id {string} The node ID.  This has to be a string, because
///                         this module does not depend on item_tree.
/// @return ret {object} the value, or ===false if the node wasn't found.
///                         val.ty holds the type.
function val_by_node_id(node_id) {
    if (typeof node_id !== "string") return false;

    // Check each piece of the model in turn
    let val;
    val = windows.by_node_id(node_id);
    if (val) return val;

    val = tabs.by_node_id(node_id);
    if (val) return val;

    return false; //not found
} //val_by_node_id()

/// Find a tab in the model by its Chrome idx
function val_by_ctabid(ctabid) {
    return tabs.by_tab_id(ctabid);
}

/// Find a window in the model by its Chrome idx
function val_by_cwinid(cwinid) {
    return windows.by_win_id(cwinid);
}

/// The above functions, indexed by ty
const finder_functions = {
    [K.IT_TAB]: val_by_ctabid,
    [K.IT_WIN]: val_by_cwinid,
};

/// Find an item in the model by its Chrome ID, indirected by type.
function val_by_cid(cid, ty) {
    const finder = finder_functions[ty];
    if (!finder) return false;
    return finder(cid);
}

module.exports = {
    tabs,
    windows,
    val_by_node_id,
    val_by_ctabid,
    val_by_cwinid,
    finder_functions,
    val_by_cid,
};

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r fdm=marker: //
