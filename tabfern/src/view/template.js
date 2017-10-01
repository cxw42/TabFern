// TODO.js:
// Copyright (c) 2017 Chris White, Jasmine Hegman.

(function (root, factory) {
    let imports=['jquery','jstree','loglevel', 'view/const' /*, TODO */];

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
        // Browser globals (root is `window`).  Assume all dependencies
        // have already been loaded, and exist in `root`.
        let requirements = [];
        for(let modulename of imports) {
            requirements.push(root[modulename]);
        }
        root./*TODO*/ = factory(...requirements);
    }
}(this, function ($, _unused_jstree_placeholder_, log_orig, K /*, TODO */) {
    "use strict";

    function loginfo(...args) { log_orig.info('TabFern template.js: ', ...args); }; //TODO

    /// The module we are creating
    let module = {};

    // TODO add code here

    return module;
}));

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
