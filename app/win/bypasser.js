// bypasser.js: Control a bypassable jstree context menu
// Original by Jasmine Hegman.  Copyright (c) 2017--2018 Chris White,
// Jasmine Hegman.
"use strict";

const $ = require("jquery");
require("lib/jstree");
const log_orig = require("loglevel");
const signals = require("signals");
const S = require("common/setting-accessors"); // in app/

function loginfo(...args) {
    log_orig.info("TabFern bypasser.js: ", ...args);
}
// for some reason, log.info.bind(log, ...) would capture the log level
// at the time of the binding, so it would not respond to later
// changes in the level.  Instead, use an actual function.
// Thankfully, `, ...args` behaves correctly even for zero-argument
// calls such as `loglevel();`.
// TODO make it show the right line number
// ==>  This is because changing the level actually rebinds the
//      log.* functions.  TODO make a loglevel plugin to handle
//      name prefixing?  See, e.g., the Plugins section on
//      https://pimterry.github.io/loglevel/

/// The prototype for a context-menu-bypass object
let Proto = Object.create(null);

Proto.isEnabled = function () {
    // TODO improve this so it is reactive to disabling it in options
    return S.getBool(S.ENB_CONTEXT_MENU, true);
};

//////////////////////////////////////////////////////////////////////////
/// State tracker for the bypass ///

Proto.isBypassDisengaged = function () {
    return !this.isBypassEngaged();
};

Proto.isBypassEngaged = function () {
    return !!this.engaged;
};

/// Tell the tree to enable the context menu
Proto.disengageBypass = function () {
    if (this.treeobj && this.treeobj._data && this.treeobj._data.contextmenu) {
        // not loaded if context menu is disabled.
        // TODO? update this so it can be used to bypass other
        // menus?  E.g., the hamburger menu.
        this.treeobj._data.contextmenu.bypass = false;
        this.engaged = false;
    }
};

/// Tell the tree to disable the context menu
Proto.engageBypass = function () {
    if (this.treeobj && this.treeobj._data && this.treeobj._data.contextmenu) {
        this.treeobj._data.contextmenu.bypass = true;
        this.engaged = true;
    }
};

/**
 * @param {Window} win
 * @param _shortcutNs The shortcut module, if any
 */
Proto.installEventHandler = function (win, shortcutNs = false) {
    this.win = win;

    if (shortcutNs) {
        loginfo("installing event handlers using Shortcuts module");
        this.installKeyListenerFromShortcuts(shortcutNs);
    } else {
        loginfo("installing event handlers using internal");
        this.installKeyListener();
    }
}; //installEventHandler

Proto.installTreeEventHandler = function () {
    // The standard right-click menu swallows the keyup, so we need
    // to track disengagement of the bypass a different way.
    let self = this;

    this.treeobj.element.on("bypass_contextmenu.jstree", function (e, data) {
        // Thanks to https://stackoverflow.com/questions/12801898#comment67451213_12802008
        // by https://stackoverflow.com/users/1543318/brant-sterling-wedel for this idea
        $(self.win).one("mousemove", function (e) {
            if (e.shiftKey) {
                self.engageBypass();
                loginfo("bypass engaged when leaving built-in context menu");
            } else {
                self.disengageBypass();
                loginfo("bypass disengaged when leaving built-in context menu");
            }
        });
    }); //on(bypass)
}; //installTreeEventHandler()

/// Listens for keyup events using jquery events.
/// @param {Window} win
Proto.installKeyListener = function () {
    let self = this;
    $(this.win).on("keydown", function (e) {
        // Shift
        if (e.which === 16) {
            loginfo("engage bypass");
            self.engageBypass();
        }
    });
    $(this.win).on("keyup", function (e) {
        // Shift
        if (e.which === 16) {
            loginfo("disengage bypass");
            self.disengageBypass();
        }
    });
}; //installKeyListener()

/// Listens for keyup events using shortcut driver
Proto.installKeyListenerFromShortcuts = function (shortcutNs) {
    let self = this;
    this.shortcutNs = shortcutNs;

    let key = this.shortcutNs.getKeyBindingFor(
        "BYPASS_CONTEXT_MENU_MOMENTARY_LATCH"
    );
    if (key && key.signal instanceof signals.Signal) {
        key.signal.add(function (direction, args) {
            if (direction === "keydown") {
                loginfo("bypassing context menu START", args[1]);
                self.engageBypass();
            }
            if (direction === "keyup") {
                loginfo("bypassing context menu STOP", args[1]);
                self.disengageBypass();
            }
        });
    }

    key = this.shortcutNs.getKeyBindingFor("ESC");
    if (!key || !(key.signal instanceof signals.Signal)) {
        throw new Error("Unexpected ESC key bind unavailable?");
    }
    key.signal.add(function (direction, args) {
        // TODO jstree close context menu
    });
};

Proto.isBypassed = function () {
    return this.isBypassEngaged();
};

//////////////////////////////////////////////////////////////////////////
// INIT //

/// Create a context-menu-bypass for the jstree at the DOM object
/// identified by #selector.  The tree must already have been created,
/// and must have the contextmenu plugin loaded.
/// @param win {DOM Window} the `window` object
/// @param treeobj {JSTree} the main jsTree object
/// @param shortcuts        A keyboard-shortcut helper, if any
/// @return {mixed} Object on success; null on failure.
function create(win, the_treeobj, shortcuts) {
    if (!win || !the_treeobj) return null;

    let retval = Object.create(Proto);
    retval.treeobj = the_treeobj;
    retval.engaged = false; // initial assumption

    retval.installEventHandler(win, shortcuts);
    retval.installTreeEventHandler();

    return Object.seal(retval);
} //ctor

module.exports = {
    create,
};

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
