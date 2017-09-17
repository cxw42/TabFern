// TODO.js:
// Copyright (c) 2017 Chris White, Jasmine Hegman.

(function (root, factory) {
    let imports=['jquery','jstree','loglevel' /*, TODO */];

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
        root./*TODO*/ = factory(...requirements);
    }
}(this, function ($, _unused_jstree_placeholder_, log_orig /*, TODO */) {
    "use strict";

    function loginfo(...args) { log_orig.info('TabFern template.js: ', ...args); }; //TODO

    /// The module we are creating
    let retval = {};

    // TODO add code here

    return retval;
}));

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
