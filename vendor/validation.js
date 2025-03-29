/// validation.js: Data-validation routines.
/// Copyright (c) cxw42, 2017--2018.
/// NOTE: does NOT use common.js routines, so that common.js can use it.

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof exports === "object") {
        // Node, CommonJS-like
        module.exports = factory();
    } else {
        // Browser globals (root is `window`)
        root.Validation = factory();
    }
})(this, function () {
    "use strict";

    /// The module we are creating
    let module = {};

    /// Validate a CSS color.  Modified from a gist by
    /// https://gist.github.com/HatScripts at
    /// https://gist.github.com/olmokramer/82ccce673f86db7cda5e#gistcomment-2082703
    module.isValidColor = function (color) {
        color = color.trim();
        if (color.charAt(0) === "#") {
            // hex colors
            color = color.substring(1);
            return (
                [3, 4, 6, 8].indexOf(color.length) > -1 &&
                !isNaN(parseInt(color, 16))
            );
        } else if (/^[A-Za-z]{1,32}$/.test(color)) {
            // color names
            return true; // for now, allow any alpha string
        } else {
            // RGB, HSL colors
            const RE =
                /^(rgb|hsl)a?\((-?[\d\.]+%?(deg|rad|grad|turn)?[,\s]+){2,3}[\s\/]*[\d\.]+%?\)$/i;
            return RE.test(color);
        }
    }; //isValidColor

    /// Validate a URL.
    /// @param test_url The URL to test
    /// @param allowed_schemes {Optional array} If provided, only those schemes
    ///                                         (no colons) are allowed.
    module.isValidURL = function (test_url, allowed_schemes) {
        try {
            let url = new URL(String(test_url));

            if (Array.isArray(allowed_schemes)) {
                let scheme = url.protocol.replace(/:$/, "");
                if (allowed_schemes.indexOf(scheme) === -1) return false;
            }

            return true;
        } catch (e) {} // nop
        return false;
    }; //isValidURL

    return module;
});

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
