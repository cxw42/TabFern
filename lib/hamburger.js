// hamburger.js: Hamburger menu for jstree.
// Uses jquery, jstree, loglevel, all of which must be loaded beforehand.
// Copyright (c) 2018--2020 Chris White

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        // AMD
        define("hamburger", ["jquery", "loglevel", "jstree"], factory);
    } else if (typeof exports === "object") {
        // Node, CommonJS-like
        module.exports = factory(
            require("jquery"),
            require("loglevel"),
            require("lib/jstree")
        );
    } else {
        // Browser globals (root is window)
        root.HamburgerMenuMaker = factory(
            root.jQuery,
            root.log,
            root.jQuery.jstree
        );
    }
})(this, function ($, log /* , jstree */) {
    /// The prototype for a hamburger-menu object
    let Proto = {};

    //////////////////////////////////////////////////////////////////////////
    // EVENTS //

    /// Replace left clicks with right clicks.
    ///     - There is only one item, so whenever it is selected, deselect it.
    ///     - Also, make left click trigger a context menu.
    Proto.onSelect = function onHamSelect(evt, evt_data) {
        this.treeobj.deselect_all(true); // `this` is the Hamburger object
        //console.log(evt_data);
        if (
            typeof evt_data.node === "undefined" ||
            typeof evt_data.instance === "undefined"
        )
            return;

        // From https://stackoverflow.com/a/26783802/2877364 by
        // https://stackoverflow.com/users/305189/pierre-de-lespinay
        setTimeout(function () {
            evt_data.instance.show_contextmenu(evt_data.node);
            // because contextmenu.select_node is false, this will not
            // reselect the node.  If it did, it would trigger an
            // infinite loop.
        }, 100);
    }; //Proto.onSelect

    //////////////////////////////////////////////////////////////////////////
    // INIT //

    /// Create a hamburger menu at the DOM object identified by #selector.
    /// Menu items should be returned by function #getMenuItems.
    /// @param selector     Where the menu should go
    /// @param getMenuItems Callback returning items, or false for none
    /// @param timeout      Optional: if provided, timeout in ms for menu
    ///                     to disappear after mouseout.
    ///                     *** CAUTION *** applies to all contextmenus in
    ///                                     the document.
    function ctor(selector, getMenuItems, timeout) {
        let retval = Object.create(Proto);
        log.info("TabFern hamburger.js initializing view at " + selector);
        let jstreeConfig = {
            plugins: ["contextmenu"],
            core: {
                animation: false,
                multiple: false, // for now
                check_callback: true, // for now, allow modifications
                themes: {
                    name: "default-dark",
                    variant: "small",
                    dots: false, // No connecting lines between nodes
                },
            },
            contextmenu: {
                items: getMenuItems,
                select_node: false, // required for onSelect to work
            },
        };

        // Create the tree
        $(selector).jstree(jstreeConfig);
        retval.treeobj = $(selector).jstree(true);

        // Close the tree on mouseout.  Note: this affects all trees
        // in the document.  Math.abs() for safety.
        if (timeout) {
            $.vakata.context.settings.hide_onmouseleave = Math.abs(timeout);
        }

        // Add the single item
        retval.tree_node = retval.treeobj.create_node(null, {
            text: "",
            icon: "fa fa-bars",
            state: { opened: false },
        });

        $(selector).on("changed.jstree", retval.onSelect.bind(retval));

        return retval; // Not sealed, to give the caller flexibility.
    } //ctor

    return ctor;
});

// Module-loader template thanks to
// http://davidbcalhoun.com/2014/what-is-amd-commonjs-and-umd/

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
