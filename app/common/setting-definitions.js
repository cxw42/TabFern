// setting-definitions.js: The TabFern settings

// Names of settings, and their defaults // {{{1

// Boolean settings start with CFG_.  Non-boolean settings start with
// /CFG[A-Z]+_/.  Currently, only CFGS_ is used, for string settings.

/// An object to stash the names of the settings in.  The values here
/// are the keys for _DEF and _VAL.
let _NAM = { __proto__: null };

/// An object to stash the defaults in.  Every property must have a default,
/// since the defaults array is also used to identify properties to be
/// saved/loaded.  The JS types of the defaults must match the types
/// of the properties.  The keys are the values of _NAM and the
/// keys of _VAL.
let _DEF = { __proto__: null };

/// An array of validators, used when loading settings.  Each is a function
/// that returns a valid value for that setting, or `undefined` to use the
/// default.  NOTE: returning "undefined" will trigger a warning on the console.
/// The keys are the values of _NAM and the keys of _VAL.
let _VAL = { __proto__: null };

/// The default validator for bool values
let _vbool = (v) => {
    return typeof v === "boolean" ? v : undefined;
};

/// The default validator for integer values.  Accepts both integers
/// and string representations of integers (e.g., in an <input>).
let _vint = (v) => {
    if (Number.isInteger(v)) {
        // real int
        return v;
    }

    v = parseInt(v, 10);
    if (Number.isInteger(v)) {
        // stringified int
        return v;
    }

    return undefined;
};

// Booleans {{{2
_NAM.CFG_POPUP_ON_STARTUP = "open-popup-on-chrome-startup";
_DEF[_NAM.CFG_POPUP_ON_STARTUP] = true;
_VAL[_NAM.CFG_POPUP_ON_STARTUP] = _vbool;

_NAM.CFG_ENB_CONTEXT_MENU = "ContextMenu.Enabled";
_DEF[_NAM.CFG_ENB_CONTEXT_MENU] = true;
_VAL[_NAM.CFG_ENB_CONTEXT_MENU] = _vbool;

_NAM.CFG_RESTORE_ON_LAST_DELETED = "open-tree-on-restore-last-deleted";
_DEF[_NAM.CFG_RESTORE_ON_LAST_DELETED] = false;
_VAL[_NAM.CFG_RESTORE_ON_LAST_DELETED] = _vbool;

_NAM.CFG_JUMP_WITH_SORT_OPEN_TOP = "jump-to-top-when-sort-open-to-top";
_DEF[_NAM.CFG_JUMP_WITH_SORT_OPEN_TOP] = true;
_VAL[_NAM.CFG_JUMP_WITH_SORT_OPEN_TOP] = _vbool;

_NAM.CFG_COLLAPSE_ON_STARTUP = "collapse-trees-on-startup";
_DEF[_NAM.CFG_COLLAPSE_ON_STARTUP] = true;
_VAL[_NAM.CFG_COLLAPSE_ON_STARTUP] = _vbool;

_NAM.CFG_OPEN_TOP_ON_STARTUP = "open-to-top-on-startup";
_DEF[_NAM.CFG_OPEN_TOP_ON_STARTUP] = false;
_VAL[_NAM.CFG_OPEN_TOP_ON_STARTUP] = _vbool;

_NAM.CFG_COLLAPSE_ON_WIN_CLOSE = "collapse-tree-on-window-close";
_DEF[_NAM.CFG_COLLAPSE_ON_WIN_CLOSE] = true;
_VAL[_NAM.CFG_COLLAPSE_ON_WIN_CLOSE] = _vbool;

//_NAM.CFG_COLLAPSE_ON_PARTIAL_WIN_CLOSE = 'collapse-tree-on-partially-open-window-close';
//_DEF[_NAM.CFG_COLLAPSE_ON_PARTIAL_WIN_CLOSE] = true;
//_VAL[_NAM.CFG_COLLAPSE_ON_PARTIAL_WIN_CLOSE] = _vbool;

_NAM.CFG_HIDE_HORIZONTAL_SCROLLBARS = "hide-horizontal-scrollbars";
_DEF[_NAM.CFG_HIDE_HORIZONTAL_SCROLLBARS] = true;
_VAL[_NAM.CFG_HIDE_HORIZONTAL_SCROLLBARS] = _vbool;

_NAM.CFG_SKINNY_SCROLLBARS = "skinny-scrollbars";
_DEF[_NAM.CFG_SKINNY_SCROLLBARS] = false;
_VAL[_NAM.CFG_SKINNY_SCROLLBARS] = _vbool;

_NAM.CFG_NEW_WINS_AT_TOP = "open-new-windows-at-top";
_DEF[_NAM.CFG_NEW_WINS_AT_TOP] = true;
_VAL[_NAM.CFG_NEW_WINS_AT_TOP] = _vbool;

_NAM.CFG_SHOW_TREE_LINES = "show-tree-lines";
_DEF[_NAM.CFG_SHOW_TREE_LINES] = false;
_VAL[_NAM.CFG_SHOW_TREE_LINES] = _vbool;

_NAM.CFG_CONFIRM_DEL_OF_SAVED = "confirm-del-of-saved-wins";
_DEF[_NAM.CFG_CONFIRM_DEL_OF_SAVED] = true;
_VAL[_NAM.CFG_CONFIRM_DEL_OF_SAVED] = _vbool;

_NAM.CFG_CONFIRM_DEL_OF_UNSAVED = "confirm-del-of-unsaved-wins";
_DEF[_NAM.CFG_CONFIRM_DEL_OF_UNSAVED] = false;
_VAL[_NAM.CFG_CONFIRM_DEL_OF_UNSAVED] = _vbool;

_NAM.CFG_CONFIRM_DEL_OF_SAVED_TABS = "confirm-del-of-saved-tabs";
_DEF[_NAM.CFG_CONFIRM_DEL_OF_SAVED_TABS] = true;
_VAL[_NAM.CFG_CONFIRM_DEL_OF_SAVED_TABS] = _vbool;

_NAM.CFG_CONFIRM_DEL_OF_UNSAVED_TABS = "confirm-del-of-unsaved-tabs";
_DEF[_NAM.CFG_CONFIRM_DEL_OF_UNSAVED_TABS] = false;
_VAL[_NAM.CFG_CONFIRM_DEL_OF_UNSAVED_TABS] = _vbool;

_NAM.CFG_CONFIRM_DEL_OF_AUDIBLE_TABS = "confirm-del-of-audible-tabs";
_DEF[_NAM.CFG_CONFIRM_DEL_OF_AUDIBLE_TABS] = false;
_VAL[_NAM.CFG_CONFIRM_DEL_OF_AUDIBLE_TABS] = _vbool;

_NAM.CFG_URL_IN_TOOLTIP = "tooltip-has-url";
_DEF[_NAM.CFG_URL_IN_TOOLTIP] = false;
_VAL[_NAM.CFG_URL_IN_TOOLTIP] = _vbool;

_NAM.CFG_TITLE_IN_TOOLTIP = "tooltip-has-title";
_DEF[_NAM.CFG_TITLE_IN_TOOLTIP] = false;
_VAL[_NAM.CFG_TITLE_IN_TOOLTIP] = _vbool;

/// Not actually a setting, but an indicator that we loaded settings OK.
/// Used by src/settings/main.js.
_NAM.SETTINGS_LOADED_OK = "__settings_loaded_OK";
_DEF[_NAM.SETTINGS_LOADED_OK] = false;
_VAL[_NAM.SETTINGS_LOADED_OK] = () => {
    return undefined;
};

// }}}2
// Strings and limited-choice controls such as radio buttons and dropdowns. {{{2

// Representations of booleans as strings
const CFG_TRUE_S = "yep";
const CFG_FALSE_S = "nope";

_NAM.CFGS_BACKGROUND = "window-background";
_DEF[_NAM.CFGS_BACKGROUND] = "";
_VAL[_NAM.CFGS_BACKGROUND] = (v) => {
    if (!v) return "";
    if (Validation.isValidColor(v)) return v;
    if (Validation.isValidURL(v, ["file", "https", "data", "chrome-extension"]))
        return v;
    return undefined;
};

_NAM.CFGS_THEME_NAME = "theme-name";
_DEF[_NAM.CFGS_THEME_NAME] = "default-dark";
_VAL[_NAM.CFGS_THEME_NAME] = (v) => {
    return v === "default-dark" || v === "default" ? v : undefined;
};

_NAM.CFGS_SCROLLBAR_COLOR = "skinny-scrollbar-color";
_DEF[_NAM.CFGS_SCROLLBAR_COLOR] = "";
_VAL[_NAM.CFGS_SCROLLBAR_COLOR] = (v) => {
    if (!v) return "";
    return Validation.isValidColor(v) ? v : undefined;
};

// #35.  Whether to open closed tabs when you click on the tree item
// for a partially-open window.  This is string, not bool, because the
// fancy-settings radio-button control provides a string value, not a Boolean.
_NAM.CFGS_OPEN_REST_ON_CLICK = "open-rest-on-win-click";
_DEF[_NAM.CFGS_OPEN_REST_ON_CLICK] = CFG_FALSE_S;
_VAL[_NAM.CFGS_OPEN_REST_ON_CLICK] = (v) => {
    return v === CFG_TRUE_S || v === CFG_FALSE_S ? v : undefined;
};

// #152.  Which order of action buttons to use for tabs.
_NAM.CFGS_WIN_ACTION_ORDER = "win-button-action-order";
_DEF[_NAM.CFGS_WIN_ACTION_ORDER] = "ecd";
_VAL[_NAM.CFGS_WIN_ACTION_ORDER] = (v) => {
    return v === "ecd" || v === "edc" || v === "ced" ? v : undefined;
};

// #196.  Where to get favicons from.
const FAVICON_SITE = "actual";
const FAVICON_CHROME = "chrome";
const FAVICON_DDG = "ddg";

_NAM.CFGS_FAVICON_SOURCE = "favicon-source";
_DEF[_NAM.CFGS_FAVICON_SOURCE] = "actual";
_VAL[_NAM.CFGS_FAVICON_SOURCE] = (v) => {
    return v === FAVICON_SITE || v === FAVICON_CHROME || v === FAVICON_DDG
        ? v
        : undefined;
};

// }}}2

// The exportable format of the above objects
const CFG_NAMES = Object.seal(_NAM);
const CFG_DEFAULTS = Object.seal(_DEF);
const CFG_VALIDATORS = Object.seal(_VAL);

////////////////////////////////////////////////////////////////////////// }}}1
// Exports // {{{1

/// The object we will export
let me = {
    // settings
    names: CFG_NAMES,
    defaults: CFG_DEFAULTS,
    validators: CFG_VALIDATORS,

    // special values settings can take on
    TRUE_S: CFG_TRUE_S,
    FALSE_S: CFG_FALSE_S,

    // FAVICON_SOURCE values
    FAVICON_SITE,
    FAVICON_CHROME,
    FAVICON_DDG,

    // The default validators
    validate_bool: _vbool,
    validate_int: _vint,
};

module.exports = me;

////////////////////////////////////////////////////////////////////////// }}}1
// vi: set fo-=o fdm=marker fdl=1: //
