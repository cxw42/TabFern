// sorts.js: Sort orders for TabFern
// Copyright (c) 2017 Chris White, Jasmine Hegman.

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        // AMD
        define([
            "jquery",
            "lib/jstree",
            "loglevel",
            "./const",
            "./item_tree",
            "./item_details",
        ], factory);
    } else if (typeof exports === "object") {
        // Node, CommonJS-like
        module.exports = factory(
            require("jquery"),
            require("lib/jstree"),
            require("loglevel"),
            require("./const"),
            require("./item_tree"),
            require("./item_details")
        );
    } else {
        // Browser globals (root is `window`)
        root.sorts = factory(
            root.$,
            root.$.jstree,
            root.log,
            root.K,
            root.T,
            root.D
        );
    }
})(this, function ($, _unused_jstree_placeholder_, log_orig, K, T, D) {
    "use strict";

    function loginfo(...args) {
        log_orig.info("TabFern view/sorts.js: ", ...args);
    } //TODO

    /// The module we are creating
    let module = {};

    /// Sweet, sweet syntactic sugar for return values from sort functions.
    const [A_FIRST, EQUAL, B_FIRST] = [-1, 0, 1];
    // God bless destructuring assignments!  They are my new favorite.

    /// A stable in-place array sort.  Modified from
    /// https://gist.github.com/fsufitch/718616fe41e92a2a2b62355c5ee14b86 by
    /// https://gist.github.com/fsufitch to be standalone rather than in
    /// Array.prototype.
    /// Also modified to include tweaks from
    /// https://stackoverflow.com/a/45422645/2877364 by
    /// https://stackoverflow.com/users/1541563/patrick-roberts
    ///
    /// @param arr_to_sort {Array} the array.
    /// @param cmp {function} the comparison function
    module.stable_sort = function (arr_to_sort, cmp) {
        // Set up to sort
        let arr_with_idxes = arr_to_sort.map((el, index) => [el, index]);

        let stable_cmp = function (a, b) {
            let order = this(a[0], b[0]); // this === cmp because of the
            return order || a[1] - b[1]; // bind() below
        }.bind(cmp);

        // Sort
        arr_with_idxes.sort(stable_cmp);

        // Push back into the source array
        for (let i = 0; i < arr_to_sort.length; ++i) {
            arr_to_sort[i] = arr_with_idxes[i][0];
        }
    }; //stable_sort()

    /// Run basic checks on two nodes.
    /// If either node is unknown to the tree, it is sorted later.  If both
    /// nodes are unknown, they are sorted equally.
    /// @param a_id {string}    One node's ID
    /// @param b_id {mixed}     The other node's ID
    /// @return {mixed}         Either a number that is the sort order, or
    ///                         an object {a_node, b_node}.
    function basic_comparisons(a_id, b_id) {
        let a_node = T.treeobj.get_node(a_id);
        let b_node = T.treeobj.get_node(b_id);

        // Known/unknown checks
        if (!a_node || !b_node) return EQUAL;
        if (a_node && !b_node) return A_FIRST; // b unknown => b later
        if (!a_node && b_node) return B_FIRST; // a unknown => a later
        if (!a_node && !b_node) return EQUAL; // both unknown => equal

        // Skip checks --- skipped nodes sort to the top
        let skip_a = a_node.data && a_node.data.skip;
        let skip_b = b_node.data && b_node.data.skip;
        if (skip_a && !skip_b) return A_FIRST;
        if (!skip_a && skip_b) return B_FIRST;

        // Otherwise we don't know, so let the caller sort it out.
        return { a_node, b_node };
    } //basic_comparisons

    /// Straight-up text comparison.
    function compare_text_simple(a_text, b_text) {
        if (a_text === b_text) return EQUAL; // e.g., both unknown
        return a_text.localeCompare(b_text, undefined, { sensitivity: "base" });
    } //compare_text_simple

    /// Sorting criterion for node text: by locale, ascending, case-insensitive.
    /// If either node is unknown to the tree, it is sorted later.  If both nodes
    /// are unknown, they are sorted equally.
    /// @param a_id {string}    One node's ID
    /// @param b_id {mixed}     The other node's ID
    /// @return {Number} -1, 0, or 1
    module.compare_node_text = function (a_id, b_id) {
        let ans = basic_comparisons(a_id, b_id);
        if (typeof ans !== "object") return ans;

        return compare_text_simple(ans.a_node.text, ans.b_node.text);
    }; //compare_node_text

    /// Sorting criterion for node text: by locale, descending,
    /// case-insensitive.  Limitations are as compare_node_text().
    module.compare_node_text_desc = function (a_id, b_id) {
        return module.compare_node_text(b_id, a_id);
    }; //compare_node_text_desc

    /// Sorting criterion for node text: numeric, by locale, ascending,
    /// case-insensitive.
    /// If either node is unknown to the tree, it is sorted later.  If both nodes
    /// are unknown, they are sorted equally.  Numbers are sorted before
    /// @param a_id {string}    One node's ID
    /// @param b_id {mixed}     The other node's ID
    /// @return {Number} -1, 0, or 1
    module.compare_node_num = function (a_id, b_id) {
        let ans = basic_comparisons(a_id, b_id);
        if (typeof ans !== "object") return ans;

        let a_text = ans.a_node.text;
        let b_text = ans.b_node.text;

        if (a_text === b_text) return EQUAL; // e.g., both unknown

        let a_num = parseFloat(a_text);
        let b_num = parseFloat(b_text);

        if (isNaN(a_num) && !isNaN(b_num)) return B_FIRST;
        // a text, b numeric => a later
        if (!isNaN(a_num) && isNaN(b_num)) return A_FIRST;
        // b text, a numeric => b later

        if (isNaN(a_num) && isNaN(b_num))
            // both are text
            return a_text.localeCompare(b_text, undefined, {
                sensitivity: "base",
            });

        // Finally!  Numeric comparison!  (including Infinity and -Infinity!)
        if (a_num === b_num) return EQUAL;
        return a_num < b_num ? A_FIRST : B_FIRST;
    }; //compare_node_num

    /// Sorting criterion for node text: numeric, by locale, descending,
    /// case-insensitive.  Limitations are as compare_node_num().
    module.compare_node_num_desc = function (a_id, b_id) {
        return module.compare_node_num(b_id, a_id);
    }; //compare_node_num_desc

    /// Sorting criterion to sort open windows by name at the top of the list.
    /// Other windows stay in their relative positions.
    /// @pre Each node being sorted must be a child of a common parent.
    module.open_windows_to_top = function (a_id, b_id) {
        let ans = basic_comparisons(a_id, b_id);
        if (typeof ans !== "object") return ans;

        let a_val = D.windows.by_node_id(a_id);
        let b_val = D.windows.by_node_id(b_id);
        if (a_val && !b_val) return A_FIRST; // b unknown => b later
        if (!a_val && b_val) return B_FIRST; // a unknown => a later
        if (!a_val && !b_val) return EQUAL; // both unknown

        if (a_val.isOpen && !b_val.isOpen) {
            return A_FIRST;
        } else if (!a_val.isOpen && b_val.isOpen) {
            return B_FIRST;
        } else if (a_val.isOpen && b_val.isOpen) {
            // both open
            return compare_text_simple(ans.a_node.text, ans.b_node.text);
        } else {
            // neither open --- preserve the existing order
            let par = T.treeobj.get_node(ans.a_node.parent);
            if (!par || !par.children) return EQUAL; //unknown
            let siblings = par.children;
            let a_pos = siblings.indexOf(a_id);
            let b_pos = siblings.indexOf(b_id);
            if (a_pos === -1 && b_pos !== -1) {
                // a unknown => a later
                return B_FIRST;
            } else if (a_pos !== -1 && b_pos === -1) {
                return A_FIRST;
            } else {
                return a_pos <= b_pos ? A_FIRST : B_FIRST;
            }
        }
    }; //open_windows_to_top

    return module;
});

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
