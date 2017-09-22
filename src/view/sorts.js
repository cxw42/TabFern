// sorts.js: Sort orders for TabFern
// Copyright (c) 2017 Chris White, Jasmine Hegman.

(function (root, factory) {
    let imports=['jquery','jstree','loglevel', 'view/const', 'view/item_tree',
                 'view/item_details'];

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
        root.tabfern_sorts = factory(...requirements);
    }
}(this, function ($, _unused_jstree_placeholder_, log_orig, K, T, D ) {
    "use strict";

    function loginfo(...args) { log_orig.info('TabFern view/sorts.js: ', ...args); }; //TODO

    /// The module we are creating
    let module = {};

    /// Sweet, sweet syntactic sugar for return values from sort functions.
    const [A_FIRST, EQUAL, B_FIRST] = [-1, 0, 1];
        // God bless destructuring assignments!  They are my new favorite.

    /// Run basic checks on two nodes.
    /// If either node is unknown to the tree, it is sorted later.  If both
    /// nodes are unknown, they are sorted equally.
    /// @param a_id {string}    One node's ID
    /// @param b_id {mixed}     The other node's ID
    /// @return {mixed}         Either a number that is the sort order, or
    ///                         an object {a_node, b_node}.
    function basic_comparisons(a_id, b_id)
    {
        let a_node = T.treeobj.get_node(a_id);
        let b_node = T.treeobj.get_node(b_id);

        // Known/unknown checks
        if(!a_node || !b_node) return EQUAL;
        if(a_node && !b_node) return A_FIRST;   // b unknown => b later
        if(!a_node && b_node) return B_FIRST;   // a unknown => a later
        if(!a_node && !b_node) return EQUAL;    // both unknown => equal

        // Skip checks --- skipped nodes sort to the top
        let skip_a = (a_node.data && a_node.data.skip);
        let skip_b = (b_node.data && b_node.data.skip);
        if(skip_a && !skip_b) return A_FIRST;
        if(!skip_a && skip_b) return B_FIRST;

        // Otherwise we don't know, so let the caller sort it out.
        return {a_node, b_node};
    } //basic_comparisons

    /// Straight-up text comparison.
    function compare_text_simple(a_text, b_text)
    {
        if(a_text === b_text) return EQUAL; // e.g., both unknown
        return a_text.localeCompare(b_text, undefined, {sensitivity:'base'});
    } //compare_text_simple

    /// Sorting criterion for node text: by locale, ascending, case-insensitive.
    /// If either node is unknown to the tree, it is sorted later.  If both nodes
    /// are unknown, they are sorted equally.
    /// @param a_id {string}    One node's ID
    /// @param b_id {mixed}     The other node's ID
    /// @return {Number} -1, 0, or 1
    module.compare_node_text = function(a_id, b_id)
    {
        let ans = basic_comparisons(a_id, b_id);
        if(typeof ans !== 'object') return ans;

        return compare_text_simple(ans.a_node.text, ans.b_node.text);
    } //compare_node_text

    /// Sorting criterion for node text: by locale, descending,
    /// case-insensitive.  Limitations are as compare_node_text().
    module.compare_node_text_desc = function(a_id,b_id)
    {
        return module.compare_node_text(b_id,a_id);
    } //compare_node_text_desc

    /// Sorting criterion for node text: numeric, by locale, ascending,
    /// case-insensitive.
    /// If either node is unknown to the tree, it is sorted later.  If both nodes
    /// are unknown, they are sorted equally.  Numbers are sorted before
    /// @param a_id {string}    One node's ID
    /// @param b_id {mixed}     The other node's ID
    /// @return {Number} -1, 0, or 1
    module.compare_node_num = function(a_id, b_id)
    {
        let ans = basic_comparisons(a_id, b_id);
        if(typeof ans !== 'object') return ans;

        let a_text = ans.a_node.text;
        let b_text = ans.b_node.text;

        if(a_text === b_text) return EQUAL; // e.g., both unknown

        let a_num = parseFloat(a_text);
        let b_num = parseFloat(b_text);

        if(isNaN(a_num) && !isNaN(b_num)) return B_FIRST;   // a text, b # => a later
        if(!isNaN(a_num) && isNaN(b_num)) return A_FIRST;   // b text, a # => b later

        if(isNaN(a_num) && isNaN(b_num))     // both are text
            return a_text.localeCompare(b_text,undefined,{sensitivity:'base'});

        // Finally!  Numeric comparison!
        if(a_num === b_num) return EQUAL;
        return (a_num < b_num ? A_FIRST : B_FIRST);
    } //compare_node_num

    /// Sorting criterion for node text: numeric, by locale, descending,
    /// case-insensitive.  Limitations are as compare_node_num().
    module.compare_node_num_desc = function(a_id,b_id)
    {
        return module.compare_node_num(b_id,a_id);
    } //compare_node_num_desc

    /// Sorting criterion to sort by name, with open windows grouped
    /// at the top of the list.
    module.open_windows_to_top = function(a_id,b_id)
    {
        let ans = basic_comparisons(a_id, b_id);
        if(typeof ans !== 'object') return ans;

        let a_val = D.windows.by_node_id(a_id);
        let b_val = D.windows.by_node_id(b_id);
        if(a_val && !b_val) return A_FIRST;   // b unknown => b later
        if(!a_val && b_val) return B_FIRST;   // a unknown => a later
        if(!a_val && !b_val) return EQUAL;    // both unknown

        if(a_val.isOpen && !b_val.isOpen) {
            return A_FIRST;
        } else if(!a_val.isOpen && b_val.isOpen) {
            return B_FIRST;
        } else {
            return compare_text_simple(ans.a_node.text, ans.b_node.text);
        }
    } //open_windows_to_top

    return module;
}));

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
