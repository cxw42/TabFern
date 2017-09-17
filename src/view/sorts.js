// sorts.js: Sort orders for TabFern
// Copyright (c) 2017 Chris White, Jasmine Hegman.

(function (root, factory) {
    let imports=['jquery','jstree','loglevel', 'view/const', 'view/tree' ];

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
        root.view_sorts = factory(...requirements);
    }
}(this, function ($, _unused_jstree_placeholder_, log_orig, K, T ) {
    "use strict";

    function loginfo(...args) { log_orig.info('TabFern view/sorts.js: ', ...args); }; //TODO

    /// The module we are creating
    let retval = {};

    /// Sorting criterion for node text: by locale, ascending, case-insensitive.
    /// If either node is unknown to the tree, it is sorted later.  If both nodes
    /// are unknown, they are sorted equally.
    /// @param a {mixed} One node, in any form acceptable to jstree.get_node()
    /// @param b {mixed} The other node, in any form acceptable to jstree.get_node()
    /// @return {Number} -1, 0, or 1
    retval.compare_node_text = function(a, b)
    {
        let a_text = T.treeobj.get_text(a);
        let b_text = T.treeobj.get_text(b);

        if(a_text === b_text) return 0;     // e.g., both unknown
        if(a_text === false) return 1;      // only #a unknown - it sorts later
        if(b_text === false) return -1;     // only #b unknown - it sorts later

        return a_text.localeCompare(b_text, undefined, {sensitivity:'base'});
    } //compare_node_text

    /// Sorting criterion for node text: by locale, descending, case-insensitive.
    /// Limitations are as compare_node_text().
    retval.compare_node_text_desc = function(a,b)
    {
        return retval.compare_node_text(b,a);
    } //compare_node_text_desc

    /// Sorting criterion for node text: numeric, by locale, ascending,
    /// case-insensitive.
    /// If either node is unknown to the tree, it is sorted later.  If both nodes
    /// are unknown, they are sorted equally.  Numbers are sorted before
    /// @param a {mixed} One node, in any form acceptable to jstree.get_node()
    /// @param b {mixed} The other node, in any form acceptable to jstree.get_node()
    /// @return {Number} -1, 0, or 1
    retval.compare_node_num = function(a, b)
    {
        let a_text = T.treeobj.get_text(a);
        let b_text = T.treeobj.get_text(b);

        if(a_text === b_text) return 0;     // e.g., both unknown
        if(a_text === false) return 1;      // only #a unknown - it sorts later
        if(b_text === false) return -1;     // only #b unknown - it sorts later

        let a_num = parseFloat(a_text);
        let b_num = parseFloat(b_text);

        if(isNaN(a_num) && !isNaN(b_num)) return 1;     // a text, b # => a later
        if(!isNaN(a_num) && isNaN(b_num)) return -1;    // b text, a # => b later

        if(isNaN(a_num) && isNaN(b_num))     // both are text
            return a_text.localeCompare(b_text, undefined, {sensitivity:'base'});

        // Finally!  Numeric comparison!
        if(a_num === b_num) return 0;
        return (a_num > b_num ? 1 : -1);
    } //compare_node_num

    /// Sorting criterion for node text: numeric, by locale, descending,
    /// case-insensitive.  Limitations are as compare_node_num().
    retval.compare_node_num_desc = function(a,b)
    {
        return retval.compare_node_num(b,a);
    } //compare_node_num_desc

    return retval;
}));

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
