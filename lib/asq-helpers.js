// asq-helpers.js: Helpers for asynquence and Chrome callbacks.

"use strict";

const ASQ = require("asynquence-contrib");

/// A special-purpose empty object, per getify
const ø = Object.create(null);

/// Chrome Callback: make a Chrome extension API callback that
/// wraps the done() callback of an asynquence step.  This is for use within
/// an ASQ().then(...).
function CC(done) {
    return function cbk() {
        if (isLastError()) {
            done.fail(chrome.runtime.lastError);
        } else {
            //done.apply(ø,...args);
            // for some reason done() doesn't get the args
            // provided to cbk(...args)
            done.apply(ø, [].slice.call(arguments));
        }
    };
} // CC()

/// Chrome callback to kick off a sequence, rather than within a sequence.
/// @param  seq     An asynquence instance
/// @param  ignore_error [optional, default false]
//                  If truthy, read but disregard chrome.runtime.lastError
/// @return A Chrome callback that will resume the sequence.
/// @post   The provided #seq will pause at whatever was the end of the chain
///         when this was called.  It will stay there until the returned
///         callback is invoked.
function CCgo(seq, ignore_error = false) {
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
} //CCgo()

/// Take action on this tick, and kick off a sequence based on a Chrome
/// callback.
/// @param do_right_now {function} Called as do_right_now(chrome_cbk).
///                                 Should cause chrome_cbk to be invoked
///                                 when the sequence should proceed.
/// @return A sequence to chain off.
function NowCC(do_right_now) {
    let seq = ASQ();
    let chrcbk = CCgo(seq);
    do_right_now(chrcbk);
    return seq;
} //NowCC()

/// Take action on this tick, and kick off a sequence based on a Chrome
/// callback, as if called with ASQ.try.
/// @param do_right_now {function} Called as do_right_now(chrome_cbk).
///                                 Should cause chrome_cbk to be invoked
///                                 when the sequence should proceed.
/// @return A sequence to chain off.
function NowCCTry(do_right_now) {
    // Inner sequence that provides the Chrome callback and the
    // try/catch functionality
    let inner_seq = ASQ();
    let inner_chrcbk = CCgo(inner_seq);

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
} //NowCCTry()

/// Check for an asynquence-contrib try() error return
function is_asq_try_err(o) {
    return typeof o === "object" && o && typeof o.catch !== "undefined";
} //is_asq_try_err()

module.exports = {
    CC,
    CCgo,
    NowCC,
    NowCCTry,
    is_asq_try_err,
};

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
