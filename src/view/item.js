// view/item.js: Routines for managing items as a whole (both tree nodes
// and detail records).  Part of TabFern.
// Copyright (c) 2017 Chris White, Jasmine Hegman.

// The item module enforces that invariant that, except during calls to these
// routines, each node in the treeobj has a 1-1 relationship with a value in
// the details.

(function (root, factory) {
    let imports=['jquery','jstree','loglevel', 'view/const', 'view/item_details',
                    'view/item_tree', 'justhtmlescape'];

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
        root.view_glue = factory(...requirements);
    }
}(this, function ($, _unused_jstree_placeholder_, log, K, M, T, Esc ) {
    "use strict";

    function loginfo(...args) { log.info('TabFern view/item.js: ', ...args); };

    /// The module we are creating
    let module = {};

    //////////////////////////////////////////////////////////////////////////
    // Data-access routines //

    /// Find a node's value in the model, regardless of type.
    /// @param node_ref {mixed} If a string, the node id; otherwise, anything
    ///                         that can be passed to jstree.get_node.
    /// @return ret {object} .ty = K.IT_*; .val = the value, or
    ///                         .ty=false if the node wasn't found.
    module.get_node_val = function(node_ref)
    {
        // Get the node ID
        let node_id;
        if(typeof node_ref === 'string') {
            node_id = node_ref;
        } else {
            let node = T.treeobj.get_node(node_ref);
            if(node === false) return retval;
            node_id = node.id;
        }

        return M.get_node_val(node_id);
    }; //get_node_val()

    /// Get the textual version of raw_title for a value
    module.get_curr_raw_text = function(val)
    {
        if(val.raw_title !== null) {
            return val.raw_title;
        } else if(val.keep) {
            return 'Saved tabs';
        } else {
            return 'Unsaved';
        }
    }; //get_curr_raw_text()

    /// Get the escaped title
    module.get_safe_text = function(val) {
        return Esc.escape(module.get_curr_raw_text(val));
    };

    //////////////////////////////////////////////////////////////////////////
    // Item manipulation //

    /// Update the tree-node text for an item.
    /// @param node_id {string} the node's ID (which doubles as the item's id)
    /// @return truthy on success, falsy on failure.
    module.refresh_label = function(node_id) {
        if(!node_id) return false;
        let {ty, val} = M.get_node_val(node_id);
        if(!val) return false;
        let retval = T.treeobj.rename_node(node_id, module.get_safe_text(val));
        // TODO also update the icon?

        T.vscroll_function();
            // Not sure why this is necessary, but I saw a vposition glitch
            // without it.

        return retval;
    };

    /// Mark the window identified by #win_node_id as to be kept.
    /// @return truthy on success; falsy on failure
    module.remember = function(win_node_id) {
        if(!win_node_id) return false;
        let {ty, val} = M.get_node_val(win_node_id);
        if(!val) return false;
        if(ty !== K.IT_WINDOW) return false;

        val.keep = K.WIN_KEEP;

        if(val.isOpen) {
            T.treeobj.set_type(win_node_id, K.NT_WIN_OPEN);
                // open implies saved, since open != ephemeral.
        } else {
            T.treeobj.set_type(win_node_id, K.NT_WIN_CLOSED);
        }

        module.refresh_label(win_node_id);
    }; //remember()

    //////////////////////////////////////////////////////////////////////////
    // Item creation //

    /// Make a node and its associated value.
    /// @param {K.IT_* constant} node_ty The type of the node to create
    /// @param {number} chrome_id   The Chrome window/tab id, if any.
    /// @return {object} {node, val}.  On failure, members are falsy.
    module.makeNodeAndValue = function(node_ty, chrome_id = K.NONE) {
        let retval = {node: null, val: null};
        switch(node_ty) {
            // TODO
            case K.IT_WINDOW:
                break;
            case K.IT_TAB:
                break;
            // otherwise leave retval as it was
        }
        return retval;
    }; //makeNodeAndValue

    /// Update the model and the tree to map a tab's node to an open Chrome tab.
    /// Fails if the tab is already mapped.
    /// @param ctab {Chrome Tab} the open tab
    /// @param node_ref {mixed} a reference to the fern for the window
    /// @return The node ID of the tab's node, or false on error
    module.bindTabToTree = function(ctab, node_ref)
    {
        // Sanity check
        let tab_val = M.tabs.by_tab_id(ctab.id);
        if(!tab_val) {
            tab_val = M.tabs.add({tab_id: ctab.id});
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

        M.tabs.add({tab_id: ctab.id, node_id: node.id,
            win_id: ctab.windowId, index: ctab.index, tab: ctab,
            raw_url: ctab.url, raw_title: ctab.title, isOpen: true
        });

        return node.id;
    } //bindTabToTree

    /// Update the model and the tree to map a fern to an open Chrome window
    /// @param cwin {Chrome Window} the open window
    /// @param fern_node_ref {mixed} a reference to the fern for the window
    /// @return The node ID of the fern's node, or false on error.
    module.bindWindowToTree = function(cwin, fern_node_ref)
    {
        // Sanity check
        let win_val = M.windows.by_win_id(cwin.id);
        if(win_val) {
            log.error( {'Refusing to map node for existing win': cwin.id,
                        'already at node':win_val.node_id});
            return false;
        }

        let node = T.treeobj.get_node(node_ref);
        if(!node) return false;

        win_val = M.windows.add({
            win_id: cwin.id, node_id: node.id, win: cwin,
            raw_title: null,    // default name
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

        let win_node_id = T.treeobj.create_node(
                $.jstree.root,                          // parent
                {     text: 'Window'                    // node data
                    , state: { 'opened': !!cwin }
                });
        if(win_node_id === false) return error_return;
        T.treeobj.set_type(win_node_id,
            ( cwin ?
                (keep ? K.NT_WIN_OPEN : K.NT_WIN_EPHEMERAL ) :
                K.NT_WIN_CLOSED)
        );

        loginfo({'Adding nodeid map for cwinid': cwin ? cwin.id : 'none'});
        let win_val = M.windows.add({
            win_id: (cwin ? cwin.id : K.NONE),
            node_id: win_node_id,
            win: (cwin ? cwin : undefined),
            raw_title: null,    // default name
            isOpen: !!cwin,
            keep: keep
        });

        T.treeobj.rename_node(win_node_id, module.get_safe_text(win_val));

        return {node_id: win_node_id, val: win_val};
    } //makeItemForWindow

    /// Create a new node for a tab, optionally for an open Chrome tab.
    /// @param parent_node_id {string} The parent's node ID (a window)
    /// @param ctab {Chrome Tab record} The open tab.
    ///                         If falsy, there is no Chrome tab presently.
    /// @param raw_url {string} If #ctab is falsy, the URL of the tab
    /// @param raw_title {string} If #ctab is falsy, the title of the tab
    /// @param node_type {string} If provided, used for the node type.
    /// @return {object} {node_id, val}.  On error,
    ///                 at least one of node_id or val will be falsy.
    module.makeItemForTab = function(parent_node_id, ctab, raw_url, raw_title,
                                        node_type) {
        let error_return = {node_id:null, val:null};
        if(!parent_node_id) return error_return;

        let tab_node_id = T.treeobj.create_node(
                parent_node_id,
                { text: 'Tab' }
        );
        if(tab_node_id === false) return error_return;

        if(node_type && typeof node_type === 'string') {
            T.treeobj.set_type(tab_node_id, node_type);
        } else {
            T.treeobj.set_type(tab_node_id, K.NT_TAB);
        }

        let tab_val = M.tabs.add({
            tab_id: (ctab ? ctab.id : K.NONE),
            node_id: tab_node_id,
            win_id: (ctab ? ctab.windowId : K.NONE),
            index: (ctab ? ctab.index : K.NONE),
            tab: (ctab || undefined),
            raw_url: (ctab ? ctab.url : String(raw_url)),
            raw_title: (ctab ? ctab.title : String(raw_title)),
            isOpen: !!ctab,
        });

        T.treeobj.rename_node(tab_node_id, module.get_safe_text(tab_val));
        T.treeobj.set_icon(tab_node_id,
            (ctab && ctab.favIconUrl ? encodeURI(ctab.favIconUrl) : 'fff-page')
        );
        // TODO if the favicon doesn't load, replace the icon with the generic
        // page icon so we don't keep hitting the favIconUrl.

        return {node_id: tab_node_id, val: tab_val};
    } //makeItemForTab

    return module;
}));

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
