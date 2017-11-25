// validation.js: Data-validation routines

(function (root, factory) {
    let imports=[];

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
        root.Validation = factory(...requirements);
    }
}(this, function () {
    "use strict";

    /// The module we are creating
    let module = {};

    /// Validate a CSS color.  Modified from a gist by
    /// https://gist.github.com/HatScripts at
    /// https://gist.github.com/olmokramer/82ccce673f86db7cda5e#gistcomment-2082703
    module.isValidColor = function(color) {
        color = color.trim();
        if (color.charAt(0) === "#") {                  // hex colors
            color = color.substring(1);
            return (
                ([3, 4, 6, 8].indexOf(color.length) > -1) &&
                (!isNaN(parseInt(color, 16)))
            );
        } else if(/^[A-Za-z]{1,32}$/.test(color)) {     // color names
            return true;    // for now, allow any alpha string
        } else {                                        // RGB, HSL colors
            const RE = /^(rgb|hsl)a?\((-?[\d\.]+%?(deg|rad|grad|turn)?[,\s]+){2,3}[\s\/]*[\d\.]+%?\)$/i;
            return RE.test(color);
        }
    } //isValidColor

    return module;
}));

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
