// asq-helpers.js: Helpers for asynquence and Chrome callbacks.

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        // AMD
        define("asq-helpers", ["asynquence-contrib"], factory);
    } else if (typeof exports === "object") {
        // Node, CommonJS-like
        module.exports = factory(require("asynquence-contrib"));
    } else {
        // Browser globals (root is `window`)
        root.ASQH = factory(root.ASQ);
    }
})(this, function (ASQ) {
    "use strict";

    function loginfo(...args) {
        log_orig.info("TabFern template.js: ", ...args);
    } //TODO

    /// The module we are creating
    let module = {};

    // Test for Firefox //
    // Not sure if I need this, but I'm playing it safe for now.  Firefox puts
    // null rather than undefined in chrome.runtime.lastError when there is
    // no error.  This is to test for null in Firefox without changing my
    // Chrome code.  Hopefully in the future I can test for null/undefined
    // in either browser, and get rid of this block.
    // This duplicates code in TabFern's src/common/common.js, but I am
    // including it here to avoid a circular dependency.
    // src/common/common.js relies on this file, but not the other way around.

    (function (mod) {
        let isLastError_chrome = () => {
            return typeof chrome.runtime.lastError !== "undefined";
        };
        let isLastError_firefox = () => {
            return chrome.runtime.lastError !== null;
        };

        if (
            typeof browser !== "undefined" &&
            browser.runtime &&
            browser.runtime.getBrowserInfo
        ) {
            browser.runtime.getBrowserInfo().then(
                (info) => {
                    // fullfillment
                    if (info.name === "Firefox") {
                        mod.isLastError = isLastError_firefox;
                    } else {
                        mod.isLastError = isLastError_chrome;
                    }
                },

                () => {
                    //rejection --- assume Chrome by default
                    mod.isLastError = isLastError_chrome;
                }
            );
        } else {
            // Chrome
            mod.isLastError = isLastError_chrome;
        }
    })(module);

    /// Chrome Callback: make a Chrome extension API callback that
    /// wraps the done() callback of an asynquence step.  This is for use within
    /// an ASQ().then(...).
    module.CC = (function () {
        /// A special-purpose empty object, per getify
        const ø = Object.create(null);

        return (done) => {
            return function cbk() {
                if (module.isLastError()) {
                    done.fail(chrome.runtime.lastError);
                } else {
                    //done.apply(ø,...args);
                    // for some reason done() doesn't get the args
                    // provided to cbk(...args)
                    done.apply(ø, [].slice.call(arguments));
                }
            };
        };
    })(); //CC()

    /// Chrome callback to kick off a sequence, rather than within a sequence.
    /// @param  seq     An asynquence instance
    /// @param  ignore_error [optional, default false]
    //                  If truthy, read but disregard chrome.runtime.lastError
    /// @return A Chrome callback that will resume the sequence.
    /// @post   The provided #seq will pause at whatever was the end of the chain
    ///         when this was called.  It will stay there until the returned
    ///         callback is invoked.
    module.CCgo = function (seq, ignore_error = false) {
        let cbk = seq.errfcb();
        let retval;
        if (ignore_error) {
            retval = function inner(...args) {
                void chrome.runtime.lastError;
                cbk(null, ...args);
            };
        } else {
            retval = function inner(...args) {
                cbk(chrome.runtime.lastError, ...args);
            };
        }
        return retval;
    }; //CCgo()

    /// Take action on this tick, and kick off a sequence based on a Chrome
    /// callback.
    /// @param do_right_now {function} Called as do_right_now(chrome_cbk).
    ///                                 Should cause chrome_cbk to be invoked
    ///                                 when the sequence should proceed.
    /// @return A sequence to chain off.
    module.NowCC = function (do_right_now) {
        let seq = ASQ();
        let chrcbk = module.CCgo(seq);
        do_right_now(chrcbk);
        return seq;
    }; //ASQ.NowCC()

    /// Take action on this tick, and kick off a sequence based on a Chrome
    /// callback, as if called with ASQ.try.
    /// @param do_right_now {function} Called as do_right_now(chrome_cbk).
    ///                                 Should cause chrome_cbk to be invoked
    ///                                 when the sequence should proceed.
    /// @return A sequence to chain off.
    module.NowCCTry = function (do_right_now) {
        // Inner sequence that provides the Chrome callback and the
        // try/catch functionality
        let inner_seq = ASQ();
        let inner_chrcbk = module.CCgo(inner_seq);

        // Outer sequence that we will return
        let outer_seq = ASQ().duplicate(); //paused

        // When inner_seq finishes, run outer_seq.  There must be a
        // better way to do this, but I don't know what it is.  You can't
        // put a .then() after a .or(), as far as I know.
        // ... Actually, maybe there's not a better way.  asq-contrib.try()
        // also uses an inner sequence.
        inner_seq
            .val((...args) => {
                outer_seq.unpause(...args);
            })
            .or((failure) => {
                // like ASQ().try()
                outer_seq.unpause({ catch: failure });
            });

        // Kick it off
        do_right_now(inner_chrcbk);

        return outer_seq;
    }; //ASQ.NowCCTry()

    /// Check for an asynquence-contrib try() error return
    module.is_asq_try_err = function (o) {
        return typeof o === "object" && o && typeof o.catch !== "undefined";
    }; //is_asq_try_err

    return module;
});

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
