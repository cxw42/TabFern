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
/// - vorny: a val or a nodey
/// TODO? Change vorny to VorVNorNY?  I.e., also accept {val:...} and
/// {node_id:...}?

// Boilerplate {{{1

(function (root, factory) {
    let imports=['jquery','jstree','loglevel', 'view/const',
                    'view/item_details', 'view/item_tree', 'justhtmlescape',
                    'buffer', 'blake2s'];

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
}(this, function ($, _unused_jstree_placeholder_, log, K, D, T, Esc,
                    Buffer, BLAKE2s) {
    "use strict";

    function loginfo(...args) { log.info('TabFern view/item.js: ', ...args); };
    // }}}1

    /// The module we are creating
    let module = {};

    /// Value returned by vn*() on error.  Both members are falsy.
    module.VN_NONE = {val: null, node_id: ''};

    // Querying the model ////////////////////////////////////////////// {{{1

    /// Get a {val, node_id} pair (vn) from one of those (vorny).
    /// @param val_or_nodey {mixed} If a string, the node ID of the
    ///                             item; otherwise, the details
    ///                             record for the item, or the jstree node
    ///                             record for the node.
    /// @param item_type {mixed=} If provided, the type of the item.
    ///             Otherwise, all types will be checked.
    /// @return {Object} {val, node_id}.    `val` is falsy if the
    ///                                     given vorny was not found.
    ///         If #item_type was specified and the given item wasn't
    ///         of that type, also returns falsy.
    module.vn_by_vorny = function(val_or_nodey, item_type) {
        if(!val_or_nodey) return module.VN_NONE;

        let val, node_id;
        if(typeof val_or_nodey === 'string') {          // a node_id
            node_id = val_or_nodey;
            switch(item_type) {
                case K.IT_WIN:
                    val = D.windows.by_node_id(node_id); break;
                case K.IT_TAB:
                    val = D.tabs.by_node_id(node_id); break;
                default:
                    val = D.val_by_node_id(node_id); break;
            }

        } else if(typeof val_or_nodey === 'object' && val_or_nodey.id &&
                val_or_nodey.parent) {                  // A jstree node
            node_id = val_or_nodey.id;
            val = D.val_by_node_id(node_id);

        } else if(typeof val_or_nodey === 'object' &&   // A val (details record)
                val_or_nodey.ty) {
            val = val_or_nodey;
            if(!val.node_id) return module.VN_NONE;
            node_id = val.node_id;
        } else {                                        // Unknown
            return module.VN_NONE;
        }

        if(item_type && (val.ty !== item_type)) {
            return module.VN_NONE;
        }
        return {val, node_id};
    }; //vn_by_vorny

    /// Determine whether a model has given subtype(s).
    /// @param vorny {mixed} The item
    /// @param tys {mixed} A single type or array of types
    /// @return {Boolean} true if #vorny has all the subtypes in #tys;
    ///                     false otherwise.
    module.has_subtype = function(vorny, ...tys) {
        if(!vorny || !tys) return false;
        if(tys.length < 1) return false;
        let {node_id} = module.vn_by_vorny(vorny);
        if(!node_id) return false;

        for(let ty of tys) {
            if(!T.treeobj.has_multitype(node_id, ty)) return false;
        }
        return true;
    }; //has_subtype

    // }}}1
    // Data-access routines //////////////////////////////////////////// {{{1

    /// Find a node's value in the model, regardless of type (DEPRECATED).
    /// TODO replace calls to this (currently only in tree.js) with calls
    /// to module.vn_by_vorny().
    /// @param vorny {mixed} A vorny for the node
    /// @return ret {object} the value, or ===false if the node wasn't found.
    module.get_node_val = function(vorny)
    {
        let {val} = module.vn_by_vorny(vorny);
        return val || false;
    }; //get_node_val()

    /// Get the textual version of raw_title for an item.
    /// @param vorny {mixed} the item
    /// @return {string}
    module.get_raw_text = function(vorny)
    {
        let {val} = module.vn_by_vorny(vorny);
        if(!val) return '** UNKNOWN **';
            // TODO throw?

        if(val.raw_title !== null) {    // window or tab
            return val.raw_title;
        } else if(val.keep) {           // default title for saved window
            return 'Saved tabs';
        } else if(val.ty === K.IT_WIN) {    // def. title for ephem. win.
            return 'Unsaved';
        } else {                        // e.g., tabs with no raw_title.
            // TODO see if this makes sense.
            return "** no title **";
        }
    }; //get_raw_text()

    /// Mark window item #vorny as unsaved (forget #vorny).
    /// @param vorny {mixed} the item
    /// @param adjust_title {Boolean=true} Add unsaved markers if truthy
    /// @return {Boolean} true on success; false on error
    module.mark_win_as_unsaved = function(vorny, adjust_title=true) {
        let {val, node_id} = module.vn_by_vorny(vorny, K.IT_WIN);
        let node = T.treeobj.get_node(node_id);
        if(!val || !node) return false;

        val.keep = K.WIN_NOKEEP;
        T.treeobj.del_multitype(node, K.NST_SAVED);

        if(adjust_title && (val.raw_title !== null)) {
            if(val.raw_title === 'Saved tabs') {
                val.raw_title = 'Unsaved';
            } else {
                val.raw_title =
                    module.remove_unsaved_markers(val.raw_title) +
                    ' (Unsaved)';
            }
        }
        // If raw_title is null, get_raw_text() will return 'Unsaved',
        // so we don't need to manually assign text here.

        module.refresh_label(val.node_id);
        module.refresh_icon(val);
        module.refresh_tooltip(val);

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
            return str.slice(0, matches.index);
        } else {
            return str;
        }
    };

    /// Get the HTML for the node's label.  The output can be passed
    /// directly to jstree.rename_node().
    /// @param vorny {mixed} The item of interest, which
    ///     can be a window or a tab.
    /// @return A string
    module.get_html_label = function(vorny) {
        let {val} = module.vn_by_vorny(vorny);
        if(!val) return false;

        let retval = '';
        if(val.isPinned) {  // TODO make this optional?
            // Note: for windows, isPinned is nonexistent, thus falsy.
            retval += '&#x1f4cc;&nbsp;';    // PUSHPIN
        }

        let raw_text = module.get_raw_text(val);    // raw_title, or default

        // Add the bullet, for tabs only.  For windows, raw_bullet is
        // always falsy.
        if(val.raw_bullet && typeof val.raw_bullet === 'string') {
            // The first condition checks for null/undefined/&c., and also
            // for empty strings.
            retval += '<span class="' + K.BULLET_CLASS + '">';
            retval += Esc.escape(val.raw_bullet);

            // Add a dingbat if there is text to go on both sides of it.
            if(raw_text && raw_text !== "\ufeff") {
                // \ufeff is a special case for the Empty New Tab Page
                // extension, which cxw42 has been using for some years now.
                retval += ' &#x2726; ';   // the dingbat
            }

            retval += '</span>';
        } //endif there's a raw_bullet

        retval += Esc.escape(raw_text);
        return retval;
    }; //get_html_label

    // }}}1
    // Item manipulation /////////////////////////////////////////////// {{{1

    /// Update the tooltip for an item.
    /// @param vorny {mixed} the item
    /// @return {Boolean} truthy on success; falsy on failure.
    module.refresh_tooltip = function(vorny) {
        let {val, node_id} = module.vn_by_vorny(vorny);
        let node = T.treeobj.get_node(node_id);
        if(!val || !node) return false;

        let strs = [];
        if(getBoolSetting(CFG_TITLE_IN_TOOLTIP)) {
            let raw_text = module.get_raw_text(val); // raw_title, or default
            strs.push(raw_text);
        }
        if(getBoolSetting(CFG_URL_IN_TOOLTIP) && (val.ty === K.IT_TAB) ) {
            strs.push(val.raw_url);
        }

        let tooltip = strs.join('\n');  // '' if no tooltips

        if(tooltip !== node.li_attr.title) {
            node.li_attr.title = tooltip;
            T.treeobj.redraw_node(node);
        }

        return true;
    }; //refresh_tooltip

    /// Update the tree-node text for an item from its details record.
    /// @param node_id {string} the node's ID (which doubles as the item's id)
    /// @return truthy on success, falsy on failure.
    module.refresh_label = function(vorny) {
        let {val, node_id} = module.vn_by_vorny(vorny);
        let node = T.treeobj.get_node(node_id);
        if(!val || !node) return;
        let retval = T.treeobj.rename_node(node, module.get_html_label(val));

        return retval;
    };

    /// Update the icon of #vorny
    /// @param vorny {Mixed} The item
    /// @return {Boolean} true on success; false on error
    module.refresh_icon = function(vorny) {
        let {val, node_id} = module.vn_by_vorny(vorny);
        let node = T.treeobj.get_node(node_id);
        if(!val || !node) return false;

        let icon;

        switch(val.ty) {
            case K.IT_TAB:
                icon = 'fff-page';
                if(val.raw_favicon_url) {
                    icon = encodeURI(val.raw_favicon_url);
                } else if((/\.pdf$/i).test(val.raw_url)) {  //special-case PDFs
                    icon = 'fff-page-white-with-red-banner';
                }
                break;

            case K.IT_WIN:
                icon = true;    // default icon for closed windows
                if(val.isOpen && val.keep) {    // open and saved
                    icon = 'fff-monitor-add';
                } else if(val.isOpen) {         // ephemeral
                    icon = 'fff-monitor';
                }
                break;

            default:
                return false;
        }

        if(!icon) return false;

        T.treeobj.set_icon(node, icon);

        // TODO? if the favicon doesn't load, replace the icon with the
        // generic page icon so we don't keep hitting the favIconUrl.

        return true;
    }; //refresh_icon

    /// Mark the window identified by #win_node_id as to be kept.
    /// @param win_vorny {mixed} The window node
    /// @param cleanup_title {optional boolean, default true}
    ///             If true, remove unsaved markers from the raw_title.
    /// @return {Boolean} true on success; false on error
    module.remember = function(win_vorny, cleanup_title = true) {
        let {val, node_id} = module.vn_by_vorny(win_vorny, K.IT_WIN);
        let node = T.treeobj.get_node(node_id);
        if(!val || !node) return false;

        val.keep = K.WIN_KEEP;
        T.treeobj.add_multitype(node, K.NST_SAVED);

        if(cleanup_title) {
            val.raw_title = module.remove_unsaved_markers(
                    module.get_raw_text(val));
        }

        module.refresh_label(node_id);
        module.refresh_icon(val);
        module.refresh_tooltip(val);
        return true;
    }; //remember()

    // }}}1
    // #####################################################################
    // #####################################################################
    // New routines: item (tree+details) as model; Chrome itself as view.
    //
    // "Rez" and "Erase" are adding/removing items, to distinguish them
    // from creating and destroying Chrome widgets.

    // Hashing routines //////////////////////////////////////////////// {{{1

    // Hash the strings in #strs together.  All strings are encoded in utf8
    // before hashing.
    // @param strs {mixed} a string or array of strings.
    // @return {String} the hash, as a string of hex chars
    module.orderedHashOfStrings = function(strs) {
        if(!Array.isArray(strs)) strs = [strs];
        let blake = new BLAKE2s(32);
        for(let str of strs) {
            let databuf = new Uint8Array(Buffer.from(str + '\0', 'utf8'));
                // Design choice: append \0 so each string has nonzero length
            blake.update(databuf);
        }
        return blake.hexDigest();
    }; //orderedHashOfStrings

    /// Update the given node's ordered_url_hash to reflect its current children.
    /// @return {Boolean} True if the ordered_url_hash was set or was
    ///                     unchanged; false if neither of those holds.
    ///                     On false return, the ordered_url_hash
    ///                     will have been set to a falsy value.
    module.updateOrderedURLHash = function(vornyParent) {
        let {val: parent_val, node_id: parent_node_id} =
            module.vn_by_vorny(vornyParent, K.IT_WIN);
        let parent_node = T.treeobj.get_node(parent_node_id);
        if(!parent_val || !parent_node_id || !parent_node) return false;

        let child_urls = [];
        for(let child_node_id of parent_node.children) {
            let child_url = D.tabs.by_node_id(child_node_id, 'raw_url');
            if(!child_url) {   // rather than inconsistent state, just clear it
                D.windows.change_key(parent_val, 'ordered_url_hash', null);
                return false;
            }
            child_urls.push(child_url);
        }

        let ordered_url_hash = module.orderedHashOfStrings(child_urls);

        // Check if a different window already has that hash.  If so, that
        // window keeps that hash.
        let other_win_val = D.windows.by_ordered_url_hash(ordered_url_hash);

        if(Object.is(parent_val, other_win_val)) {
            return true;    // it's already us :)
        } else if(other_win_val) {
            D.windows.change_key(parent_val, 'ordered_url_hash', null);
                // This window will no longer participate in merge detection.
            return false;
        } else {
            D.windows.change_key(parent_val, 'ordered_url_hash', ordered_url_hash);
            return true;
        }
    }; //updateOrderedURLHash()

    // }}}1
    ////////////////////////////////////////////////////////////////////
    // Initializing and shutting down the model

    // TODO add a function that wraps T.create() so the user of model does
    // not have to directly access T to kick things off.

    // Adding model items ////////////////////////////////////////////// {{{1

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
                (isFirstChild ? 1 : 'last')
                    // 1 => after the holding pen (T.holding_node_id)
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

        module.refresh_label(node_id);
        module.refresh_icon(val);
        module.refresh_tooltip(val);

        return {val, node_id};
    }; //vnRezWin

    /// Add a model node/item for a tab, with the given parent.
    /// Does not process Chrome widgets.  Instead, assumes the tab is
    /// closed initially.
    ///
    /// @param {mixed} vornyParent The parent
    /// @return {Object} {val, node_id} The new item,
    ///                                 or module.VN_NONE on error.
    module.vnRezTab = function(vornyParent) {
        let {val: parent_val, node_id: parent_node_id} =
            module.vn_by_vorny(vornyParent);
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
            isPinned: false,
        });

        if(!val) {
            T.treeobj.delete_node(node_id);
            return module.VN_NONE;
        }

        module.refresh_label(node_id);
        module.refresh_icon(val);
        module.refresh_tooltip(val);

        return {val, node_id};
    }; //vnRezTab

    // }}}1
    // Updating model items //////////////////////////////////////////// {{{1

    /// Add a subtype (K.NST_*) to an item.
    /// @param vorny {mixed} The item
    /// @param tys {mixed} A single type or array of types
    /// @return {Boolean} true on success; false on error
    module.add_subtype = function(vorny, ...tys) {
        if(!vorny || !tys) return false;
        if(tys.length < 1) return false;
        let {node_id} = module.vn_by_vorny(vorny);
        if(!node_id) return false;

        for(let ty of tys) {
            T.treeobj.add_multitype(node_id, ty);
                // TODO report failure to add a type?
        }
        return true;
    }; //add_subtype

    /// Remove a subtype (K.NST_*) from an item.
    /// @param vorny {mixed} The item
    /// @param tys {mixed} A single type or array of types
    /// @return {Boolean} true on success; false on error
    module.del_subtype = function(vorny, ...tys) {
        if(!vorny || !tys) return false;
        if(tys.length < 1) return false;
        let {node_id} = module.vn_by_vorny(vorny);
        if(!node_id) return false;

        for(let ty of tys) {
            T.treeobj.del_multitype(node_id, ty);
                // TODO report failure to remove a type?
        }
        return true;
    }; //add_subtype

    // TODO? implement this?
//    /// Modify #vorny with all the changes from #deltas in one go.
//    module.change = function(vorny, deltas) {
//        let {val, node_id} = module.vn_by_vorny(vorny);
//        let node = T.treeobj.get_node(node_id);
//        if(!deltas || (typeof deltas !== 'object') || !val || !node) return;
//
//        /// A list of functions of this module to be called after
//        /// the values are changed.
//        let updates = [];
//
//        // Update the internal data
//        for(let k in deltas) {
//            let v = deltas[k];
//            //TODO update val
//            //TODO push the appropriate update
//        }
//
//        // Commit the updates to the visible tree
//        for(let fn of updates) {
//            module[fn](vorny);
//        }
//    }; //change

    // }}}1
    // Mapping model indices /////////////////////////////////////////// {{{1

    // The model stores ctab indices, and each tree node has an index under
    // its parent.  These functions map between those indices.
    //
    // Mapping is used in: treeOnSelect(), tabOnCreated(), tabOnMoved(),
    // tabOnAttached(), treeCheckCallback():move_open_tab_in_window(), and
    // treeCheckCallback():open_tab_within_window().
    //
    // Refreshing tree indices is used in: actionOpenRestOfTabs(),
    // actionCloseTabAndSave(), connectChromeWindowToTreeWindowItem(),
    // treeOnSelect(), tabOnCreated():tab_on_created_inner(),
    // tabOnMoved(), tabOnRemoved(), tabOnDetached(), tabOnAttached(),
    // treeCheckCallback():move_open_tab_in_window(), and
    // treeCheckCallback():open_tab_within_window(),

    /// Set the tab.index values of the tab nodes in a window.  Assumes that
    /// the nodes are in the proper order in the tree.  Only uses the model;
    /// doesn't touch the cwin or ctabs.
    /// As a convenience, also updates the window's ordered_url_hash.  This
    /// function is generally called when something has changed that requires
    /// recalculation anyway.
    ///
    /// \pre    #win_node_id is the id of a node that both exists and represents
    ///         a window.
    ///
    /// @param win_nodey {mixed} The window, in any form accepted by jstree.get_node
    /// @param as_open {Array} optional array of nodes to treat as if they were open
    module.updateTabIndexValues = function updateTabIndexValues(win_nodey, as_open = [])
    {
        // NOTE: later, when adding nested trees, see
        // https://stackoverflow.com/a/10823248/2877364 by
        // https://stackoverflow.com/users/106224/boltclock

        let win_node = T.treeobj.get_node(win_nodey);
        if(win_node===false) return;

        let tab_index=0;
        for(let tab_node_id of win_node.children) {
            let tab_val = D.tabs.by_node_id(tab_node_id);

            if( tab_val &&
                (tab_val.isOpen || (as_open.indexOf(tab_node_id)!== -1) )
            ) {
                tab_val.index = tab_index;
                ++tab_index;
            }
        }

        let old_hash = D.windows.by_node_id(win_node.id, 'ordered_url_hash'); //DEBUG

        M.updateOrderedURLHash(win_node.id);

        let new_hash = D.windows.by_node_id(win_node.id, 'ordered_url_hash'); //DEBUG
        log.trace(`win ${win_node.id} hash from ${old_hash} to ${new_hash}`); //DEBUG
    } //updateTabIndexValues

    /// See if any children are closed.
    /// @param win_nodey {mixed} The window in question
    module.isWinPartlyOpen = function isWinPartlyOpen(win_nodey)
    {
        let win_node = T.treeobj.get_node(win_nodey);
        if(!win_node) return false;

        // Window can't be partly open if it's closed
        if(!D.windows.by_node_id(win_node.id, 'isOpen')) return false;

        for(let child_node_id of win_node.children) {
            if(!D.tabs.by_node_id(child_node_id, 'isOpen')) {
                return true;    // At least one closed child => partly open
            }
        } //foreach child

        return false;           // All open children => not partly open
    } //isWinPartlyOpen()

    /// Convert a Chrome tab index to an index in the tree for a window,
    /// even if the window is partly open.
    /// @pre The window must be open.
    /// @param win_nodey {mixed} The window in question
    /// @param cidx {nonnegative integer} the Chrome ctab.index
    module.treeIdxByChromeIdx = function treeIdxByChromeIdx(win_nodey, cidx)
    {
        let win_node = T.treeobj.get_node(win_nodey);
        if(!win_node) return false;

        // Window can't be partly open if it's closed
        if(!D.windows.by_node_id(win_node.id, 'isOpen')) return false;
        let nkids = win_node.children.length;

        // #cidx is the number of open tabs we have to skip to get to where
        // we want to insert.

        let remaining = cidx;   //                     ||
        let child_idx;          // Note: this was <=,  VV  but I don't recall why.
        for(child_idx=0; (remaining > 0) && (child_idx < nkids); ++child_idx) {
                                //                     ^^
            let child_node_id = win_node.children[child_idx];
            if(D.tabs.by_node_id(child_node_id, 'isOpen')) {
                --remaining;
            }
        }

        return child_idx;   // jstree index, so 0 <= retval <= nkids
    } //treeIdxByChromeIdx()

    /// Convert a tree index to a Chrome tab index in a window,
    /// even if the window is partly open.
    /// @pre The window must be open.
    /// @param win_nodey {mixed} The window in question
    /// @param tree_item {mixed} The child node or index whose ctab index we want.
    ///         If string, the node ID; otherwise, the tree index in the tree.
    /// @pre #tree_idx <= number of children of #win_nodey
    module.chromeIdxOfTab = function chromeIdxOfTab(win_nodey, tree_item)
    {
        let win_node = T.treeobj.get_node(win_nodey);
        if(!win_node) return false;

        // Window can't be partly open if it's closed
        if(!D.windows.by_node_id(win_node.id, 'isOpen')) return false;
        let nkids = win_node.children.length;

        let tree_idx;
        if(typeof tree_item !== 'string') {
            tree_idx = tree_item;
        } else {
            tree_idx = win_node.children.indexOf(tree_item);
            if(tree_idx === -1) return false;
        }

        let retval = tree_idx;
        for(let child_idx=0; child_idx < tree_idx; ++child_idx) {
            let child_node_id = win_node.children[child_idx];

            // Closed tabs don't contribute to the Chrome tab count
            if(!D.tabs.by_node_id(child_node_id, 'isOpen')) {
                --retval;
            }
        } //for tree-node children

        return retval;
    } //chromeIdxOfTab()

    // }}}1
    // Attaching Chrome widgets to model items ///////////////////////// {{{1

    /// Attach a Chrome window to an existing window item.
    /// Updates the item, but does not touch the Chrome window.
    /// @param win_vorny {mixed} The item
    /// @param cwin {Chrome Window} The open window
    /// @return {Boolean} true on success; false on error
    module.markWinAsOpen = function(win_vorny, cwin) {
        if(!win_vorny || !cwin || !cwin.id) return false;

        let {val, node_id} = module.vn_by_vorny(win_vorny, K.IT_WIN);
        if(!val || !node_id) return false;

        if(val.isOpen || val.win) {
            log.info({'Refusing to re-mark already-open window as open':val});
            return false;
        }

        let node = T.treeobj.get_node(node_id);
        if(!node) return false;

        T.treeobj.open_node(node_id);
            // We always open nodes for presently-open windows.  However, this
            // won't work if no tabs have been added yet.

        D.windows.change_key(val, 'win_id', cwin.id);
        // node_id unchanged
        val.win = cwin;
        // raw_title unchanged (TODO is this the Right Thing?)
        val.isOpen = true;
        // keep unchanged
        // raw_bullet unchanged

        T.treeobj.add_multitype(node_id, K.NST_OPEN);

        module.refresh_label(node_id);
        module.refresh_icon(val);
        module.refresh_tooltip(val);

        return true;
    }; //markWinAsOpen

    /// Attach a Chrome tab to an existing tab item.
    /// Updates the item, but does not touch the Chrome tab.
    /// As a result, the item takes values from the tab.
    /// ** NOTE ** Does NOT update the parent's val.ordered_url_hash.
    /// ** NOTE ** Does NOT put the tab item in order under the parent
    /// ** NOTE ** Does NOT attach any child nodes to tabs.
    /// @param tab_vorny {mixed} The item
    /// @param ctab {Chrome Tab} The open tab
    /// @return {Boolean} true on success; false on error
    module.markTabAsOpen = function(tab_vorny, ctab) {
        if(!tab_vorny || !ctab || !ctab.id) return false;

        let {val, node_id} = module.vn_by_vorny(tab_vorny, K.IT_TAB);
        if(!val || !node_id) return false;

        if(val.isOpen || val.tab) {
            log.info({'Refusing to re-mark already-open tab as open':val});
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
        val.isPinned = !!ctab.pinned;

        T.treeobj.add_multitype(node_id, K.NST_OPEN);

        module.refresh_label(node_id);
        module.refresh_icon(val);   // since favicon may have changed
        module.refresh_tooltip(val);

        // Design decision: tree items for open windows always start expanded.
        // No one has requested any other behaviour, as of the time of writing.
        T.treeobj.open_node(node.parent);

        return true;
    }; //markTabAsOpen

    // }}}1
    // Removing Chrome widgets from model items //////////////////////// {{{1

    /// Remove the connection between #win_vorny and its Chrome window.
    /// Use this when the Chrome window has been closed.
    /// NOTE: does not do anything with the tabs.
    /// @param win_vorny {mixed} The item
    /// @return {Boolean} true on success; false on error
    module.markWinAsClosed = function(win_vorny) {
        if(!win_vorny) return false;

        let {val, node_id} = module.vn_by_vorny(win_vorny, K.IT_WIN);
        if(!val || !node_id) return false;

        if(!val.isOpen || !val.win) {
            log.info({'Refusing to re-mark already-closed window as closed':val});
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
        module.refresh_icon(val);
        module.refresh_tooltip(val);

        return true;
    }; //markWinAsClosed

    /// Remove the connection between #tab_vorny and its Chrome tab.
    /// Use this when the Chrome tab has been closed.
    /// NOTE: does not handle saved/unsaved at this time.  TODO should it?
    /// @param tab_vorny {mixed} The item
    /// @return {Boolean} true on success; false on error
    module.markTabAsClosed = function(tab_vorny) {
        if(!tab_vorny) return false;

        let {val, node_id} = module.vn_by_vorny(tab_vorny, K.IT_TAB);
        if(!val || !node_id) return false;
        let node = T.treeobj.get_node(node_id);
        if(!node) return false;

        if(!val.isOpen || !val.tab) {
            log.info({'Refusing to re-mark already-closed tab as closed':val});
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
        // Don't change tooltip - closing a tab doesn't affect the
        // raw_title or raw_url.

        return true;
    }; //markTabAsClosed

    // }}}1
    // Removing model items //////////////////////////////////////////// {{{1

    /// Delete a tab from the tree and the details.
    /// ** NOTE ** Does NOT update the parent's val.ordered_url_hash.
    /// TODO? Report error if tab is currently open?
    /// @param tab_vorny {mixed}
    /// @return {Boolean} true on success; false on error
    module.eraseTab = function(tab_vorny) {
        let {val, node_id} = module.vn_by_vorny(tab_vorny, K.IT_TAB);
        let node = T.treeobj.get_node(node_id);
        if(!val || !node_id || !node) return false;

        let parent_node_id = node.parent;

        D.tabs.remove_value(val);
            // So any events that are triggered won't try to look for a
            // nonexistent tab.
        T.treeobj.delete_node(node_id);

        return true;
    }; //eraseTab

    /// Delete a window from the tree and the details.  This will also
    /// erase any remaining child nodes of #win_vorny from the
    /// tree and the details.  On an error return, not all children may
    /// have been destroyed.
    /// TODO? Report error if win is currently open?
    /// TODO? Report error if any children are left?
    /// @param win_vorny {mixed}  The item
    /// @return {Boolean} true on success; false on error
    module.eraseWin = function(win_vorny) {
        let {val, node_id} = module.vn_by_vorny(win_vorny, K.IT_WIN);
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
    }; //eraseWin

    // }}}1

    return module;
}));

// vi: set ts=4 sts=4 sw=4 et ai fo-=ro foldmethod=marker: //
