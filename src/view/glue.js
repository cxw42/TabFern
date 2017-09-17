// view/glue.js: Routines for connecting and disconnecting the model
// and the tree.  Part of TabFern.
// Copyright (c) 2017 Chris White, Jasmine Hegman.

// A "Fern" is the subtree for a particular window, including a node
// representing the window and zero or more children of that node representing
// tabs.  The fern ID is the node ID of the node representing the window.

(function (root, factory) {
    let imports=['jquery','jstree','loglevel', 'view/const', 'view/model',
                    'view/tree', 'justhtmlescape'];

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
}(this, function ($, _unused_jstree_placeholder_, log_orig, K, M, T, Esc ) {
    "use strict";

    function loginfo(...args) { log_orig.info('TabFern view/glue.js: ', ...args); }; //TODO

    /// The module we are creating
    let module = {};

    //////////////////////////////////////////////////////////////////////////
    // Data-access routines //

    /// Find a node's value in the model, regardless of type.
    /// @param node_ref {mixed} If a string, the node id; otherwise, anything
    ///                         that can be passed to jstree.get_node.
    /// @return ret {object} .ty = K.NT_*; .val = the value, or
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

    /// Get the textual version of raw_title for a window
    module.get_curr_raw_text = function(win_val)
    {
        if(win_val.raw_title !== null) {
            return win_val.raw_title;
        } else if(win_val.keep) {
            return 'Saved tabs';
        } else {
            return 'Unsaved';
        }
    }; //get_curr_raw_text()

    /// Get the escaped title
    module.get_safe_text = function(win_val) {
        return Esc.escape(module.get_curr_raw_text(win_val));
    };

    //////////////////////////////////////////////////////////////////////////
    // Data-manipulation routines //

    /// Create a new fern for an open Chrome window.
    /// @param cwin {Chrome Window record}
    ///     The open window.  If #cwin is populated with its tabs, the child
    ///     nodes in the fern will be created.
    /// @return undefined on error, or else
    ///         {win_node_id (the fern's id), win_val}
    module.makeFernForWindow = function(cwin, keep, icon, li_class) {
        let win_node_id = T.treeobj.create_node(null,
                {     text: 'Window'
                    , icon
                    , li_attr: { class: li_class }
                    , state: { 'opened': true }
                });
        if(win_node_id === false) return {};

        loginfo('Adding nodeid map for cwinid ' + cwin.id);
        let win_val = M.windows.add({
            win_id: cwin.id, node_id: win_node_id, win: cwin,
            raw_title: null,    // default name
            isOpen: true, keep: keep
        });

        T.treeobj.rename_node(win_node_id, module.get_safe_text(win_val));

        return {win_node_id, win_val};
    } //makeFernForWindow

    return module;
}));

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
