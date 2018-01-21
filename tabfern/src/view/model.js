// view/model.js: Routines for managing items as a whole (both tree nodes
// and detail records).  Part of TabFern.
// Copyright (c) 2017--2018 Chris White, Jasmine Hegman.

// The item module enforces that invariant that, except during calls to these
// routines, each node in the treeobj has a 1-1 relationship with a value in
// the details.  The treeobj, including its DOM, is part of the model.

/// Hungarian elements used in this file:
/// - vn: a {val, node_id} object
/// - vorn: a val, or a node_id
/// - n: a jstree node_id
/// - ny: anything that can be passed to jstree.get_node() ("nodey" by
///   analogy with "truthy" and "falsy."

(function (root, factory) {
    let imports=['jquery','jstree','loglevel', 'view/const',
                    'view/item_details', 'view/item_tree', 'justhtmlescape'];

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
        root.tabfern_item = factory(...requirements);
    }
}(this, function ($, _unused_jstree_placeholder_, log, K, D, T, Esc ) {
    "use strict";

    function loginfo(...args) { log.info('TabFern view/item.js: ', ...args); };

    /// The module we are creating
    let module = {};

    /// Value returned by vn*() on error
    module.VN_NONE = {val: null, node_id: ''};

    //////////////////////////////////////////////////////////////////////
    // Data-access routines //

    /// Find a node's value in the model, regardless of type.
    /// @param node_ref {mixed} If a string, the node id; otherwise, anything
    ///                         that can be passed to jstree.get_node.
    /// @return ret {object} the value, or ===false if the node wasn't found.
    module.get_node_val = function(node_ref)
    {
        // Get the node ID
        let node_id;

        if(typeof node_ref === 'string') {
            node_id = node_ref;
        } else {
            let node = T.treeobj.get_node(node_ref);
            if(node === false) return false;
            node_id = node.id;
        }

        return D.val_by_node_id(node_id);
    }; //get_node_val()

    /// Get the textual version of raw_title for a window's value
    module.get_win_raw_text = function(val)
    {
        if(val.raw_title !== null) {
            return val.raw_title;
        } else if(val.keep) {
            return 'Saved tabs';
        } else {
            return 'Unsaved';
        }
    }; //get_win_raw_text()

    /// Mark window item #val as unsaved.
    /// @param val {Object} the item
    /// @return {Boolean} true on success; false on error
    module.mark_win_as_unsaved = function(val) {
        if(!val || val.ty !== K.IT_WIN || !val.node_id) return false;
        val.keep = K.WIN_NOKEEP;
        if(val.raw_title !== null) {
            val.raw_title = module.remove_unsaved_markers(val.raw_title) +
                            ' (Unsaved)';
        }
        // If raw_title is null, get_win_raw_text() will return 'Unsaved',
        // so we don't need to manually assign text here.

        module.refresh_label(val.node_id);
        return true;
    }; //mark_as_unsaved()

    /// Remove " (Unsaved)" flags from a string
    /// @param str {mixed} A string, or falsy.
    /// @return
    ///     If #str is falsy, a copy of #str.
    //      Otherwise, #str as a string, without the markers if any were present
    module.remove_unsaved_markers = function(str) {
        if(!str) return str;
        str = str.toString();
        let re = /(\s+\(Unsaved\)){1,}\s*$/i;
        let matches = str.match(re);
        if(matches && matches.index > 0) {
            return str.slice(0,matches.index);
        } else {
            return str;
        }
    };

    /// Get the HTML for the node's label.  The output can be passed
    /// directly to jstree.rename_node().
    /// @param val The multidex value for the item of interest
    /// @return A string
    module.get_html_label = function(val) {
        let retval = '';
        if(val.raw_bullet && typeof val.raw_bullet === 'string') {
            // The first condition checks for null/undefined/&c., and also for
            // empty strings.
            retval += '<span class="' + K.BULLET_CLASS + '">';
            retval += Esc.escape(val.raw_bullet);
            retval += ' &#x2726;';   // a dingbat
            retval += '</span> ';
        }

        retval += Esc.escape(module.get_win_raw_text(val));
        return retval;
    };

    //////////////////////////////////////////////////////////////////////
    // Item manipulation //

    /// Update the tree-node text for an item.
    /// @param node_id {string} the node's ID (which doubles as the item's id)
    /// @return truthy on success, falsy on failure.
    module.refresh_label = function(node_id) {
        if(!node_id) return false;
        let val = D.val_by_node_id(node_id);
        if(!val) return false;
        let retval = T.treeobj.rename_node(node_id, module.get_html_label(val));

        return retval;
    };

    /// Update the icon of tab item #val.
    /// @param val {Object} The details record for this item
    /// @return {Boolean} true on success; false on error
    module.refresh_tab_icon = function(val) {
        if(!val || !val.node_id) return false;
        if(val.ty !== K.IT_TAB) return false;

        let icon = 'fff-page';
        if(val.raw_favicon_url) {
            icon = encodeURI(val.raw_favicon_url);
        } else if((/\.pdf$/i).test(val.raw_url)) {  //special-case PDFs
            icon = 'fff-page-white-with-red-banner';
        }

        T.treeobj.set_icon(val.node_id, icon);

        // TODO? if the favicon doesn't load, replace the icon with the
        // generic page icon so we don't keep hitting the favIconUrl.

        return true;
    } //refresh_tab_icon

    /// Mark the window identified by #win_node_id as to be kept.
    /// @param win_node_id {string} The window node ID
    /// @param cleanup_title {optional boolean, default true}
    ///             If true, remove unsaved markers from the raw_title.
    /// @return {Boolean} true on success; false on error
    module.remember = function(win_node_id, cleanup_title = true) {
        if(!win_node_id) return false;
        let val = D.windows.by_node_id(win_node_id);
        if(!val) return false;

        val.keep = K.WIN_KEEP;
        T.treeobj.add_multitype(win_node_id, K.NST_SAVED);

        if(cleanup_title) {
            val.raw_title = module.remove_unsaved_markers(
                    module.get_win_raw_text(val));
        }

        module.refresh_label(win_node_id);
        return true;
    }; //remember()

    //////////////////////////////////////////////////////////////////////
    // Item creation //

    /// Create a new fern, optionally for an open Chrome window.
    /// ** Does not populate any tab nodes --- this is just for a window.
    /// @param cwin {Chrome Window record} The open window.
    ///                         If falsy, there is no Chrome window presently.
    /// @param keep {boolean} If #cwin is truthy, determines whether the window
    ///                         is (true) open and saved or (false) ephemeral.
    ///                         If #cwin is falsy, #keep is ignored and treated
    ///                         as if it were `true`.
    /// @return {object} {node_id (the fern's id), val}.  On error,
    ///                 at least one of node_id or val will be falsy.
    module.makeItemForWindow = function(cwin, keep) {
        if(!cwin) keep = K.WIN_KEEP;  //creating item for a closed window => keep
        keep = (keep ? K.WIN_KEEP : K.WIN_NOKEEP);  //regularize

        let error_return = {node_id:null, val:null};

        let pos = (!!cwin && getBoolSetting(CFG_NEW_WINS_AT_TOP)) ? 'first' : 'last';
        let win_node_id = T.treeobj.create_node(
                $.jstree.root,                          // parent
                {     text: 'Window'                    // node data
                    , state: { 'opened': !!cwin }
                },
                pos
        );
        if(win_node_id === false) return error_return;
        T.treeobj.add_multitype(win_node_id, K.IT_WIN);
        if(cwin) T.treeobj.add_multitype(win_node_id, K.NST_OPEN);
        if(keep) T.treeobj.add_multitype(win_node_id, K.NST_SAVED);

        loginfo({'Adding nodeid map for cwinid': cwin ? cwin.id : 'none'});
        let win_val = D.windows.add({
            win_id: (cwin ? cwin.id : K.NONE),
            node_id: win_node_id,
            win: (cwin ? cwin : undefined),
            raw_title: null,    // default name
            raw_bullet: null,
            isOpen: !!cwin,
            keep: keep
        });

        T.treeobj.rename_node(win_node_id, module.get_html_label(win_val));

        return {node_id: win_node_id, val: win_val};
    } //makeItemForWindow

    /// Create a new node for a tab, optionally for an open Chrome tab.
    /// @param parent_node_id {string} The parent's node ID (a window)
    /// @param ctab {Chrome Tab record} The open tab.
    ///                         If falsy, there is no Chrome tab presently.
    /// @param raw_url {string} If #ctab is falsy, the URL of the tab
    /// @param raw_title {string} If #ctab is falsy, the title of the tab
    /// @param tys {mixed} If provided, add those multitypes to the tab
    /// @return {object} {node_id, val}.  On error,
    ///                 at least one of node_id or val will be falsy.
    module.makeItemForTab = function(parent_node_id, ctab, raw_url, raw_title,
            tys) {
        let error_return = {node_id:null, val:null};
        if(!parent_node_id) return error_return;

        let tab_node_id = T.treeobj.create_node(
                parent_node_id,
                { text: 'Tab' }
        );
        if(tab_node_id === false) return error_return;

        T.treeobj.add_multitype(tab_node_id, K.IT_TAB);
        if(ctab) T.treeobj.add_multitype(tab_node_id, K.NST_OPEN);

        if(tys) {
            if(!$.isArray(tys)) tys=[tys];
            for(let ty of tys) T.treeobj.add_multitype(tab_node_id, ty);
        }

        let tab_val = D.tabs.add({
            tab_id: (ctab ? ctab.id : K.NONE),
            node_id: tab_node_id,
            win_id: (ctab ? ctab.windowId : K.NONE),
            index: (ctab ? ctab.index : K.NONE),
            tab: (ctab || undefined),
            raw_url: (ctab ? ctab.url : String(raw_url)),
            raw_title: (ctab ? ctab.title : String(raw_title)),
            raw_bullet: null,
            isOpen: !!ctab,
        });

        T.treeobj.rename_node(tab_node_id, module.get_html_label(tab_val));

        { // Set icon
            let icon = 'fff-page';
            if(ctab && ctab.favIconUrl) {
                icon = encodeURI(ctab.favIconUrl);
            } else if((/\.pdf$/i).test(tab_val.raw_url)) {  //special-case PDFs
                icon = 'fff-page-white-with-red-banner';
            }
            T.treeobj.set_icon(tab_node_id, icon);
            // TODO if the favicon doesn't load, replace the icon with the
            // generic page icon so we don't keep hitting the favIconUrl.
        }

        return {node_id: tab_node_id, val: tab_val};
    } //makeItemForTab

    // #####################################################################
    // #####################################################################
    // New routines: item (tree+details) as model; Chrome itself as view.
    //
    // "Rez" and "Erase" are adding/removing items, to distinguish them
    // from creating and destroying Chrome widgets.

    //////////////////////////////////////////////////////////////////////
    // Common routines

    /// Get a {val, node_id} pair (vn) from one of those (vorn).
    /// @param val_or_node_id {mixed} If a string, the node ID of the
    ///                               item; otherwise, the details
    ///                               record for the item.
    /// @param item_type {mixed=} If provided, the type of the item.
    ///             Otherwise, all types will be checked.
    /// @return {Object} {val, node_id}.    `val` is falsy if the
    ///                                     given vorn was not found.
    module.vn_by_vorn = function(val_or_node_id, item_type) {
        if(!val_or_node_id) return module.VN_NONE;

        let val, node_id;
        if(typeof val_or_node_id === 'string') {
            node_id = val_or_node_id;
            switch(item_type) {
                case K.IT_WIN:
                    val = D.windows.by_node_id(node_id); break;
                case K.IT_TAB:
                    val = D.tabs.by_node_id(node_id); break;
                default:
                    val = D.val_by_node_id(node_id); break;
            }
        } else {
            val = val_or_node_id;
            if(!val.node_id) return module.VN_NONE;
            node_id = val.node_id;
        }

        return {val, node_id};
    } //vn_by_vorn

    //////////////////////////////////////////////////////////////////////
    // Initializing and shutting down the model

    // TODO add a function that wraps T.create() so the user of model does
    // not have to directly access T to kick things off.

    //////////////////////////////////////////////////////////////////////
    // Adding model items

    /// Add a model node/item for a window.  Does not process Chrome
    /// widgets.  Instead, assumes the tab is closed initially.
    ///
    /// @param isFirstChild {Boolean} [false] If truthy, the new node will be
    ///     the first child of its parent; otherwise, the last child.
    /// @return {Object} {val, node_id} The new item,
    ///                                 or module.VN_NONE on error.
    module.vnRezWin = function(isFirstChild=false) {
        let node_id = T.treeobj.create_node(
                $.jstree.root,
                { text: 'Window' },
                (isFirstChild ? 'first' : 'last')
        );
        if(node_id === false) return module.VN_NONE;

        T.treeobj.add_multitype(node_id, K.IT_WIN);

        let val = D.windows.add({
            win_id: K.NONE,
            node_id: node_id,
            win: undefined,
            raw_title: null,
            raw_bullet: null,
            isOpen: false,
            keep: undefined
        });

        if(!val) {
            T.treeobj.delete_node(node_id);
            return module.VN_NONE;
        }

        return {val, node_id};
    } //vnRezWin

    /// Add a model node/item for a tab, with the given parent.
    /// Does not process Chrome widgets.  Instead, assumes the tab is
    /// closed initially.
    ///
    /// @param {mixed} vornParent The parent
    /// @return {Object} {val, node_id} The new item,
    ///                                 or module.VN_NONE on error.
    module.vnRezTab = function(vornParent) {
        let {val: parent_val, node_id: parent_node_id} =
            module.vn_by_vorn(vornParent);
        if(!parent_val || !parent_node_id) return module.VN_NONE;

        // Sanity check that the node also exists
        let parent_node = T.treeobj.get_node(parent_node_id);
        if(!parent_node) return module.VN_NONE;

        let node_id = T.treeobj.create_node(
                parent_node,
                { text: 'Tab' }
        );
        if(node_id === false) return module.VN_NONE;

        T.treeobj.add_multitype(node_id, K.IT_TAB);

        let val = D.tabs.add({
            tab_id: K.NONE,
            node_id: node_id,
            win_id: K.NONE,
            index: K.NONE,
            tab: undefined,
            isOpen: false,
        });

        if(!val) {
            T.treeobj.delete_node(node_id);
            return module.VN_NONE;
        }

        return {val, node_id};
    } //vnRezTab

    //////////////////////////////////////////////////////////////////////
    // Updating model items

    /// Add a subtype (K.NST_*) to an item.
    /// @param vorn {mixed} The item
    /// @param tys {mixed} A single type or array of types
    /// @return {Boolean} true on success; false on error
    module.add_subtype = function(vorn, ...tys) {
        if(!vorn || !tys) return false;
        if(tys.length < 1) return false;
        let {node_id} = module.vn_by_vorn(vorn);
        if(!node_id) return false;

        for(let ty of tys) {
            T.treeobj.add_multitype(node_id, ty);
                // TODO report failure to add a type?
        }
        return true;
    } //add_subtype

    /// Remove a subtype (K.NST_*) from an item.
    /// @param vorn {mixed} The item
    /// @param tys {mixed} A single type or array of types
    /// @return {Boolean} true on success; false on error
    module.del_subtype = function(vorn, ...tys) {
        if(!vorn || !tys) return false;
        if(tys.length < 1) return false;
        let {node_id} = module.vn_by_vorn(vorn);
        if(!node_id) return false;

        for(let ty of tys) {
            T.treeobj.del_multitype(node_id, ty);
                // TODO report failure to remove a type?
        }
        return true;
    } //add_subtype

    //////////////////////////////////////////////////////////////////////
    // Attaching Chrome widgets to model items

    /// Attach a Chrome window to an existing window item.
    /// Updates the item, but does not touch the Chrome window.
    /// @param win_vorn {mixed} The item
    /// @param cwin {Chrome Window} The open window
    /// @return {Boolean} true on success; false on error
    module.markWinAsOpen = function(win_vorn, cwin) {
        if(!win_vorn || !cwin || !cwin.id) return false;

        let {val, node_id} = module.vn_by_vorn(win_vorn, K.IT_WIN);
        if(!val || !node_id) return false;

        if(val.isOpen || val.win) {
            log.error({'Refusing to re-mark already-open window as open':val});
            return false;
        }

        let node = T.treeobj.get_node(node_id);
        if(!node) return false;

        D.windows.change_key(val, 'win_id', cwin.id);
        // node_id unchanged
        val.win = cwin;
        // raw_title unchanged (TODO is this the Right Thing?)
        val.isOpen = true;
        // keep unchanged
        // raw_bullet unchanged

        T.treeobj.add_multitype(node_id, K.NST_OPEN);

        module.refresh_label(node_id);
        // TODO refresh icon?

        return true;
    } //markWinAsOpen

    /// Attach a Chrome tab to an existing tab item.
    /// Updates the item, but does not touch the Chrome tab.
    /// @param tab_vorn {mixed} The item
    /// @param ctab {Chrome Tab} The open tab
    /// @return {Boolean} true on success; false on error
    module.markTabAsOpen = function(tab_vorn, ctab) {
        if(!tab_vorn || !ctab || !ctab.id) return false;

        let {val, node_id} = module.vn_by_vorn(tab_vorn, K.IT_TAB);
        if(!val || !node_id) return false;

        if(val.isOpen || val.tab) {
            log.error({'Refusing to re-mark already-open tab as open':val});
            return false;
        }

        let node = T.treeobj.get_node(node_id);
        if(!node) return false;

        D.tabs.change_key(val, 'tab_id', ctab.id);
        // It already has a node_id
        val.win_id = ctab.windowId;
        val.index = ctab.index;
        val.tab = ctab;
        // val.being_opened unchanged
        val.raw_url = ctab.url;
        val.raw_title = ctab.title;
        val.isOpen = true;
        // val.raw_bullet is unchanged since it doesn't come from ctab
        val.raw_favicon_url = ctab.favIconUrl;

        T.treeobj.add_multitype(node_id, K.NST_OPEN);

        module.refresh_label(node_id);
        module.refresh_tab_icon(val);   // since favicon may have changed

        return true;
    } //markTabAsOpen

    //////////////////////////////////////////////////////////////////////
    // Removing Chrome widgets from model items

    /// Remove the connection between #win_vorn and its Chrome window.
    /// Use this when the Chrome window has been closed.
    /// @param win_vorn {mixed} The item
    /// @return {Boolean} true on success; false on error
    module.markWinAsClosed = function(win_vorn) {
        if(!win_vorn) return false;

        let {val, node_id} = module.vn_by_vorn(win_vorn, K.IT_WIN);
        if(!val || !node_id) return false;

        if(!val.isOpen || !val.win) {
            log.error({'Refusing to re-mark already-closed window as closed':val});
            return false;
        }

        D.windows.change_key(val, 'win_id', K.NONE);
        // node_id unchanged
        val.win = undefined;
        // raw_title unchanged
        val.isOpen = false;
        // keep unchanged - this is an unmark, not an erase.
        // raw_bullet unchanged

        T.treeobj.del_multitype(node_id, K.NST_OPEN);

        module.refresh_label(node_id);
        //TODO refresh icon

        return true;
    } //markWinAsClosed

    /// Remove the connection between #tab_vorn and its Chrome tab.
    /// Use this when the Chrome tab has been closed.
    /// NOTE: does not handle saved/unsaved at this time.  TODO should it?
    /// @param tab_vorn {mixed} The item
    /// @return {Boolean} true on success; false on error
    module.markTabAsClosed = function(tab_vorn) {
        if(!tab_vorn) return false;

        let {val, node_id} = module.vn_by_vorn(tab_vorn, K.IT_TAB);
        if(!val || !node_id) return false;

        if(!val.isOpen || !val.tab) {
            log.error({'Refusing to re-mark already-closed tab as closed':val});
            return false;
        }

        D.tabs.change_key(val, 'tab_id', K.NONE);
        // node_id is unchanged
        val.win_id = K.NONE;
        val.index = K.NONE;
        val.tab = undefined;
        // being_opened unchanged
        // raw_url unchanged
        // raw_title unchanged
        val.isOpen = false;
        // raw_bullet unchanged
        // raw_favicon_url unchanged

        T.treeobj.del_multitype(node_id, K.NST_OPEN);

        module.refresh_label(node_id);  // TODO is this necessary?
        // Don't change icon - keep favicon

        return true;
    } //markTabAsClosed

    //////////////////////////////////////////////////////////////////////
    // Removing model items

    /// Delete a tab from the tree and the details.
    /// TODO? Report error if tab is currently open?
    /// @param tab_vorn {mixed}
    /// @return {Boolean} true on success; false on error
    module.eraseTab = function(tab_vorn) {
        let {val, node_id} = module.vn_by_vorn(tab_vorn, K.IT_TAB);
        if(!val || !node_id) return false;

        D.tabs.remove_value(val);
            // So any events that are triggered won't try to look for a
            // nonexistent tab.
        T.treeobj.delete_node(node_id);
        return true;
    } //eraseTab

    /// Delete a window from the tree and the details.  This will also
    /// erase any remaining child nodes of #win_val_or_node_id from the
    /// tree and the details.  On an error return, not all children may
    /// have been destroyed.
    /// TODO? Report error if win is currently open?
    /// TODO? Report error if any children are left?
    /// @param win_val_or_node_id {mixed}  If a string, the node ID of the
    ///                                     window; otherwise, the details
    ///                                     record for the window.
    /// @return {Boolean} true on success; false on error
    module.eraseWin = function(win_val_or_node_id) {
        let {val, node_id} = module.vn_by_vorn(win_val_or_node_id, K.IT_WIN);
        if(!val || !node_id) return false;

        let node = T.treeobj.get_node(node_id);
        if(!node) return false;

        // Remove the children cleanly
        for(let child_node_id of node.children) {
            if(!module.eraseTab(child_node_id)) {
                return false;
            }
        }

        D.windows.remove_value(val);
            // So any events that are triggered won't try to look for a
            // nonexistent window.
        T.treeobj.delete_node(node_id);

        return true;
    } //eraseWin

    return module;
}));

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
