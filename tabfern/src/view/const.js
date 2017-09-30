// view/const.js: constants and generic helpers for the TabFern view
// Copyright (c) 2017 Chris White, Jasmine Hegman.

(function (root, factory) {
    let imports=['jquery','jstree','loglevel','asq.src' ];
        // asq.src.js is copied from the npm asynquence package

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
        root.tabfern_const = factory(...requirements);
    }
}(this, function ($, _unused_jstree_placeholder_, log_orig, ASQ ) {
    "use strict";

    function loginfo(...args) { log_orig.info('TabFern view/const.js: ', ...args); };

    /// The module we are creating
    let module = {
        STORAGE_KEY: 'tabfern-data',
            ///< Store the saved windows/tabs
        LOCN_KEY: 'tabfern-window-location',
            ///< Store where the tabfern popup is
        LASTVER_KEY: 'tabfern-last-version',
            ///< Store the last version used on this system, for showing a
            ///< "What's New" notification

        SAVE_DATA_AS_VERSION: 1,       // version we are currently saving

        WIN_CLASS: 'tabfern-window',    // class on all <li>s representing windows
        TAB_CLASS: 'tabfern-tab',       // class on all <li>s representing tabs
        BORDERED_TAB_CLASS: 'tabfern-tab-bordered',     // class on <li>s with a top border
        FOCUSED_WIN_CLASS: 'tf-focused-window',  // Class on the currently-focused win
        VISIBLE_WIN_CLASS: 'tf-visible-window',  // Class on all visible wins
        ACTION_GROUP_WIN_CLASS: 'tf-action-group',   // Class on action-group div
        ACTION_BUTTON_WIN_CLASS: 'tf-action-button', // Class on action buttons (<i>)
        SHOW_ACTIONS_CLASS:  'tf-show-actions',
            // Class on a .jstree-node to indicate its actions should be shown

        BULLET_CLASS: 'tf-bullet',      // class on spans showing bullets for items

        INIT_TIME_ALLOWED_MS:  3000,  // After this time, if init isn't done,
                                            // display an error message.
        INIT_MSG_SEL:  'div#init-incomplete',     // Selector for that message

        CLASS_RECOVERED:  'ephemeral-recovered',

        /// How often to check whether our window has been moved or resized
        RESIZE_DETECTOR_INTERVAL_MS:  5000,

        /// This many ms after mouseout, a context menu will disappear
        CONTEXT_MENU_MOUSEOUT_TIMEOUT_MS:  1500,

        // --- Syntactic sugar ---
        WIN_KEEP:  true,    // must be truthy
        WIN_NOKEEP:  false, // must be falsy
        NONE:  chrome.windows.WINDOW_ID_NONE,
            ///< Do not assume that NONE and WINDOW_ID_NONE will always be the same!

        // Item-type enumeration.  Here because there may be more item
        // types in the future (e.g., dividers or plugins).  Each IT_*
        // must be truthy.
        IT_WINDOW:  'window',   // strings are used for ease of debugging
        IT_TAB:     'tab',

        // Node types - these control the display of the
        // corresponding list items.
        NT_WIN_DORMANT:     'win_dormant',              // closed, saved
        NT_WIN_RECOVERED:   'win_ephemeral_recovered',  // closed, saved, recovered
        NT_WIN_EPHEMERAL:   'win_ephemeral',            // open, unsaved
        NT_WIN_ELVISH:      'win_elvish',               // open, saved

        NT_TAB:             'tab',              // a normal tab
        NT_TAB_BORDERED:    'tab-bordered',     // a tab with a border on top
                                    // (this is a hack until I can add dividers)
    };

    // Sets of node types
    module.NTs_TAB = [module.NT_TAB, module.NT_TAB_BORDERED];
    module.NTs_WIN_OPEN = [module.NT_WIN_EPHEMERAL, module.NT_WIN_ELVISH];

    /// Ignore a Chrome callback error, and suppress Chrome's
    /// `runtime.lastError` diagnostic.
    module.ignore_chrome_error = function() { void chrome.runtime.lastError; }

    /// Make a callback function that will forward to #fn on a later tick.
    /// @param fn {function} the function to call
    module.nextTickRunner = function(fn) {
        function inner(...args) {   // the actual callback
            setTimeout( function() { fn(...args); } ,0);
                // on a later tick, call #fn, passing it ther arguments the
                // actual callback (inner()) got.
        }
        return inner;
    } //nextTickRunner()

    // Helpers for asynquence

    /// A special-purpose empty object, per getify
    const ø = Object.create(null);

    /// Chrome Callback: make a Chrome extension API callback that
    /// wraps the done() callback of an asynquence step.
    function CC(done) {
        return function cbk() {
            if(typeof(chrome.runtime.lastError) !== 'undefined') {
                done.fail(chrome.runtime.lastError);
            } else {
                //done.apply(ø,...args);
                    // for some reason done() doesn't get the args
                    // provided to cbk(...args)
                done.apply(ø,[].slice.call(arguments));
            }
        }
    } //CC

    module.CC = CC;     // might be useful elsewhere

    /// Open a new window with a given URL.  Also remove the default
    /// tab that appears because we are letting the window open at the
    /// default size.  Yes, this is a bit like a FOUC, but oh well.
    module.openWindowForURL = function(url) {
        let win_id;     // TODO is there a better way to pass data down
                        // the sequence?

        ASQ()
        .then(function open_win(done){ chrome.windows.create(CC(done)); })
        .then(function open_tab(done, new_win){
            win_id = new_win.id;
            chrome.tabs.create({windowId: win_id, url: url}, CC(done));
        })
        .then(function get_old_tab(done){
            chrome.tabs.query({windowId: win_id, index: 0}, CC(done));
        })
        .then(function remove_old_tab(done, tabs){
            chrome.tabs.remove(tabs[0].id, CC(done));
        })
        .or(function(err){log_orig.error({'Load error':err, url});})
        ;

        // To start the sequence paused, use `let seq = ASQ().duplicate()` above
        // instead of just ASQ().  Then, to fire it off, `seq.unpause();`.

    } //openWindowForURL

    return Object.freeze(module);   // all fields constant
}));

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
