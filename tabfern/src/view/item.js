// view/item.js: Routines for managing items as a whole (both tree nodes
// and detail records).  Part of TabFern.
// Copyright (c) 2017 Chris White, Jasmine Hegman.

// The item module enforces that invariant that, except during calls to these
// routines, each node in the treeobj has a 1-1 relationship with a value in
// the details.

// TODO name these functions with some kind of Hungarian notation so you know
// whether they take node_id, val, or something else.

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

    //////////////////////////////////////////////////////////////////////////
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

    module.mark_as_unsaved = function(val) {
        val.keep = K.WIN_NOKEEP;
        if(val.raw_title !== null) {
            val.raw_title = module.remove_unsaved_markers(val.raw_title) +
                            ' (Unsaved)';
        }
        // If raw_title is null, get_win_raw_text() will return 'Unsaved',
        // so we don't need to do anything here.
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

    //////////////////////////////////////////////////////////////////////////
    // Item manipulation //

    /// Update the tree-node text for an item.
    /// @param node_id {string} the node's ID (which doubles as the item's id)
    /// @return truthy on success, falsy on failure.
    module.refresh_label = function(node_id) {
        if(!node_id) return false;
        let val = D.val_by_node_id(node_id);
        if(!val) return false;
        let retval = T.treeobj.rename_node(node_id, module.get_html_label(val));
        // TODO also update the icon?

        return retval;
    };

    /// Mark the window identified by #win_node_id as to be kept.
    /// @param win_node_id {string} The window node ID
    /// @param cleanup_title {optional boolean, default true}
    ///             If true, remove unsaved markers from the raw_title.
    /// @return truthy on success; falsy on failure
    module.remember = function(win_node_id, cleanup_title = true) {
        if(!win_node_id) return false;
        let val = D.val_by_node_id(win_node_id);
        if(!val) return false;
        if(val.ty !== K.IT_WIN) return false;

        val.keep = K.WIN_KEEP;
        T.treeobj.add_multitype(win_node_id, K.NST_SAVED);

        if(cleanup_title) {
            val.raw_title = module.remove_unsaved_markers(
                    module.get_win_raw_text(val));
        }

        module.refresh_label(win_node_id);
        return true;
    }; //remember()

    ////////////////////////////////////////////////////////////////////////
    // Item creation //

    /// Make a node and its associated value.
    /// @param {K.IT_* constant} node_ty The type of the node to create
    /// @param {number} chrome_id   The Chrome window/tab id, if any.
    /// @return {object} {node, val}.  On failure, members are falsy.
    module.makeNodeAndValue_NOTYETDONE = function(node_ty, chrome_id = K.NONE) {
        let retval = {node: null, val: null};
        switch(node_ty) {
            // TODO
            case K.IT_WIN:
                break;
            case K.IT_TAB:
                break;
            // otherwise leave retval as it was
        }
        return retval;
    }; //makeNodeAndValue

    /// Update the model and the tree to map a tab's node to an open Chrome tab.
    /// @param node_ref {mixed} a reference to the node for the tab
    /// @param ctab {Chrome Tab} the open tab
    /// @return True on success, or false on error
    module.realizeTab_NOTYETDONE = function(node_ref, ctab)
    {
        // Sanity check
        let tab_val = D.tabs.by_tab_id(ctab.id);
        if(!tab_val) {
            tab_val = D.tabs.add({tab_id: ctab.id});
            log.error( {'Refusing to map node for existing tab': ctab.id,
                        'already at node':tab_val.node_id});
            return false;
        }

        let node = T.treeobj.get_node(node_ref);
        if(!node) return false;

        T.treeobj.rename_node(node, Esc.escape(ctab.title));
        T.treeobj.set_icon(node,
            (ctab.favIconUrl ? encodeURI(ctab.favIconUrl) : 'fff-page') );
            // TODO if the favicon doesn't load, replace the icon with the generic
            // page icon so we don't keep hitting the favIconUrl.

        D.tabs.add({tab_id: ctab.id, node_id: node.id,
            win_id: ctab.windowId, index: ctab.index, tab: ctab,
            raw_url: ctab.url, raw_title: ctab.title, isOpen: true,
            raw_bullet: null,
        });

        return node.id;
    } //realizeTab

    /// Remove a tab's connection to #ctab.  The tab's node stays in the tree.
    module.virtualizeTab_NOTYETDONE = function(node_ref, ctab)
    {
    } //virtualizeTab

    /// Update the model and the tree to map a fern to an open Chrome window
    /// @param cwin {Chrome Window} the open window
    /// @param fern_node_ref {mixed} a reference to the fern for the window
    /// @return The node ID of the fern's node, or false on error.
    module.bindWindowToTree_NOTYETDONE = function(cwin, fern_node_ref)
    {
        // Sanity check
        let win_val = D.windows.by_win_id(cwin.id);
        if(win_val) {
            log.error( {'Refusing to map node for existing win': cwin.id,
                        'already at node':win_val.node_id});
            return false;
        }

        let node = T.treeobj.get_node(node_ref);
        if(!node) return false;

        win_val = D.windows.add({
            win_id: cwin.id, node_id: node.id, win: cwin,
            raw_title: null,    // default name
            raw_bullet: null,
            isOpen: true, keep: keep
        });

        return node.id;
    } //bindWindowToTree

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
    // "Record" and "Erase" are adding/removing items, to distinguish them
    // from creating and destroying Chrome widgets.

    ////////////////////////////////////////////////////////////////////////
    // Removing items

    /// Delete a tab from the tree and the details.
    /// @param tab_val_or_node_id {mixed}  If a string, the node ID of the
    ///                                     tab; otherwise, the details
    ///                                     record for the tab.
    module.eraseTab = function(tab_val_or_node_id) {
        if(!tab_val_or_node_id) return;

        let tab_val, tab_node_id;
        if(typeof tab_val_or_node_id === 'string') {
            tab_node_id = tab_val_or_node_id;
            tab_val = D.tabs.by_node_id(tab_node_id);
        } else {
            tab_val = tab_val_or_node_id;
            tab_node_id = tab_val.node_id;
        }

        D.tabs.remove_value(tab_val);
            // So any events that are triggered won't try to look for a
            // nonexistent tab.
        T.treeobj.delete_node(tab_node_id);
    } //eraseTab

    /// Delete a window from the tree and the details.
    /// @param win_val_or_node_id {mixed}  If a string, the node ID of the
    ///                                     window; otherwise, the details
    ///                                     record for the window.
    module.eraseWin = function(win_val_or_node_id) {
        if(!win_val_or_node_id) return;

        let win_val, win_node_id;
        if(typeof win_val_or_node_id === 'string') {
            win_node_id = win_val_or_node_id;
            win_val = D.windows.by_node_id(win_node_id);
        } else {
            win_val = win_val_or_node_id;
            win_node_id = win_val.node_id;
        }

        D.windows.remove_value(win_val);
            // So any events that are triggered won't try to look for a
            // nonexistent window.
        T.treeobj.delete_node(win_node_id);
    } //eraseWin

    return module;
}));

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
