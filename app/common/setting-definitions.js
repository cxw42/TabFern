// setting-definitions.js: The TabFern settings, and setting-access functions

// Names of settings, and their defaults // {{{1

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
let _vbool = (v)=>{ return ((typeof v === 'boolean')?v:undefined)};

// Booleans {{{2
_NAM.CFG_POPUP_ON_STARTUP = 'open-popup-on-chrome-startup';
_DEF[_NAM.CFG_POPUP_ON_STARTUP] = true;
_VAL[_NAM.CFG_POPUP_ON_STARTUP] = _vbool;

_NAM.CFG_FLIP_BUTTONS = 'flip-buttons';
_DEF[_NAM.CFG_FLIP_BUTTONS] = false;
_VAL[_NAM.CFG_FLIP_BUTTONS] = _vbool;

_NAM.CFG_ENB_CONTEXT_MENU = 'ContextMenu.Enabled';
_DEF[_NAM.CFG_ENB_CONTEXT_MENU] = true;
_VAL[_NAM.CFG_ENB_CONTEXT_MENU] = _vbool;

_NAM.CFG_RESTORE_ON_LAST_DELETED = 'open-tree-on-restore-last-deleted';
_DEF[_NAM.CFG_RESTORE_ON_LAST_DELETED] = false;
_VAL[_NAM.CFG_RESTORE_ON_LAST_DELETED] = _vbool;

_NAM.CFG_JUMP_WITH_SORT_OPEN_TOP = 'jump-to-top-when-sort-open-to-top';
_DEF[_NAM.CFG_JUMP_WITH_SORT_OPEN_TOP] = true;
_VAL[_NAM.CFG_JUMP_WITH_SORT_OPEN_TOP] = _vbool;

_NAM.CFG_COLLAPSE_ON_STARTUP = 'collapse-trees-on-startup';
_DEF[_NAM.CFG_COLLAPSE_ON_STARTUP] = true;
_VAL[_NAM.CFG_COLLAPSE_ON_STARTUP] = _vbool;

_NAM.CFG_OPEN_TOP_ON_STARTUP = 'open-to-top-on-startup';
_DEF[_NAM.CFG_OPEN_TOP_ON_STARTUP] = false;
_VAL[_NAM.CFG_OPEN_TOP_ON_STARTUP] = _vbool;

_NAM.CFG_COLLAPSE_ON_WIN_CLOSE = 'collapse-tree-on-window-close';
_DEF[_NAM.CFG_COLLAPSE_ON_WIN_CLOSE] = true;
_VAL[_NAM.CFG_COLLAPSE_ON_WIN_CLOSE] = _vbool;

_NAM.CFG_COLLAPSE_ON_PARTIAL_WIN_CLOSE = 'collapse-tree-on-partially-open-window-close';
_DEF[_NAM.CFG_COLLAPSE_ON_PARTIAL_WIN_CLOSE] = true;
_VAL[_NAM.CFG_COLLAPSE_ON_PARTIAL_WIN_CLOSE] = _vbool;

_NAM.CFG_HIDE_HORIZONTAL_SCROLLBARS = 'hide-horizontal-scrollbars';
_DEF[_NAM.CFG_HIDE_HORIZONTAL_SCROLLBARS] = true;
_VAL[_NAM.CFG_HIDE_HORIZONTAL_SCROLLBARS] = _vbool;

_NAM.CFG_SKINNY_SCROLLBARS = 'skinny-scrollbars';
_DEF[_NAM.CFG_SKINNY_SCROLLBARS] = false;
_VAL[_NAM.CFG_SKINNY_SCROLLBARS] = _vbool;

_NAM.CFG_NEW_WINS_AT_TOP = 'open-new-windows-at-top';
_DEF[_NAM.CFG_NEW_WINS_AT_TOP] = true;
_VAL[_NAM.CFG_NEW_WINS_AT_TOP] = _vbool;

_NAM.CFG_SHOW_TREE_LINES = 'show-tree-lines';
_DEF[_NAM.CFG_SHOW_TREE_LINES] = false;
_VAL[_NAM.CFG_SHOW_TREE_LINES] = _vbool;

_NAM.CFG_CONFIRM_DEL_OF_SAVED = 'confirm-del-of-saved-wins';
_DEF[_NAM.CFG_CONFIRM_DEL_OF_SAVED] = true;
_VAL[_NAM.CFG_CONFIRM_DEL_OF_SAVED] = _vbool;

_NAM.CFG_CONFIRM_DEL_OF_UNSAVED = 'confirm-del-of-unsaved-wins';
_DEF[_NAM.CFG_CONFIRM_DEL_OF_UNSAVED] = false;
_VAL[_NAM.CFG_CONFIRM_DEL_OF_UNSAVED] = _vbool;

_NAM.CFG_CONFIRM_DEL_OF_SAVED_TABS = 'confirm-del-of-saved-tabs';
_DEF[_NAM.CFG_CONFIRM_DEL_OF_SAVED_TABS] = true;
_VAL[_NAM.CFG_CONFIRM_DEL_OF_SAVED_TABS] = _vbool;

_NAM.CFG_CONFIRM_DEL_OF_UNSAVED_TABS = 'confirm-del-of-unsaved-tabs';
_DEF[_NAM.CFG_CONFIRM_DEL_OF_UNSAVED_TABS] = false;
_VAL[_NAM.CFG_CONFIRM_DEL_OF_UNSAVED_TABS] = _vbool;

_NAM.CFG_URL_IN_TOOLTIP = 'tooltip-has-url';
_DEF[_NAM.CFG_URL_IN_TOOLTIP] = false;
_VAL[_NAM.CFG_URL_IN_TOOLTIP] = _vbool;

_NAM.CFG_TITLE_IN_TOOLTIP = 'tooltip-has-title';
_DEF[_NAM.CFG_TITLE_IN_TOOLTIP] = false;
_VAL[_NAM.CFG_TITLE_IN_TOOLTIP] = _vbool;

_NAM.CFG_PRUNE_NEW_WINDOWS = 'prune-new-windows';
_DEF[_NAM.CFG_PRUNE_NEW_WINDOWS] = false;
_VAL[_NAM.CFG_PRUNE_NEW_WINDOWS] = ()=>false;
    // Always false --- don't permit a settings load to set prune to true.

/// Not actually a setting, but an indicator that we loaded settings OK.
/// Used by src/settings/main.js.
_NAM.SETTINGS_LOADED_OK = '__settings_loaded_OK';
_DEF[_NAM.SETTINGS_LOADED_OK] = false;
_VAL[_NAM.SETTINGS_LOADED_OK] = ()=>{return undefined;}

// }}}2
// Strings and limited-choice controls such as radio buttons and dropdowns. {{{2
_NAM.CFGS_BACKGROUND = 'window-background';
_DEF[_NAM.CFGS_BACKGROUND] = '';
_VAL[_NAM.CFGS_BACKGROUND] = (v)=>{
    if(!v) return '';
    if(Validation.isValidColor(v)) return v;
    if(Validation.isValidURL(v,
                    ['file', 'https', 'data', 'chrome-extension'])) return v;
    return undefined;
};

_NAM.CFGS_THEME_NAME = 'theme-name';
_DEF[_NAM.CFGS_THEME_NAME] = 'default-dark';
_VAL[_NAM.CFGS_THEME_NAME] = (v)=>{
    return (( v === 'default-dark' || v === 'default' ) ? v : undefined);
};

_NAM.CFGS_SCROLLBAR_COLOR = 'skinny-scrollbar-color';
_DEF[_NAM.CFGS_SCROLLBAR_COLOR] = '';
_VAL[_NAM.CFGS_SCROLLBAR_COLOR] = (v)=>{
    if(!v) return '';
    return ((Validation.isValidColor(v)) ? v : undefined);
};

// #35.  Whether to open closed tabs when you click on the tree item
// for a partially-open window.  This is string, not bool, because the
// fancy-settings radio-button control provides a string value, not a Boolean.
_NAM.CFGS_OPEN_REST_ON_CLICK = 'open-rest-on-win-click';
const CFG_OROC_DO = "yep";
const CFG_OROC_DO_NOT = "nope";
_DEF[_NAM.CFGS_OPEN_REST_ON_CLICK] = CFG_OROC_DO_NOT;
_VAL[_NAM.CFGS_OPEN_REST_ON_CLICK] = (v)=>{
    return (( v === CFG_OROC_DO || v === CFG_OROC_DO_NOT ) ? v : undefined);
};

// }}}2

/// The default values for the configuration settings.
const CFG_NAMES = Object.seal(_NAM);
const CFG_DEFAULTS = Object.seal(_DEF);
const CFG_VALIDATORS = Object.seal(_VAL);

////////////////////////////////////////////////////////////////////////// }}}1
// Setting-related functions // {{{1

const SETTING_PREFIX = 'store.settings.';

/// Get the raw value of a setting.  Returns null if the key doesn't exist.
/// @param setting_name     A value in CFG_NAMES
function getRawSetting(setting_name)
{
    return localStorage.getItem(SETTING_PREFIX + setting_name);
} //getSetting

/// Get the string value of a setting, if it is a string.
/// @param setting_name     A value in CFG_NAMES
/// @param default_value    Optional default.  If unspecified or
///                         undefined, the default from CFG_DEFAULTS
///                         is used.
function getStringSetting(setting_name, default_value = undefined)
{
    if(typeof default_value === 'undefined' && setting_name in CFG_DEFAULTS) {
        default_value = CFG_DEFAULTS[setting_name];
    }

    let locStorageValue = localStorage.getItem(SETTING_PREFIX + setting_name);

    if ( locStorageValue !== null ) {   // key exists
        // Get the value, which is stored as JSON
        try {
            let val = JSON.parse(locStorageValue);
            if(typeof val === 'string') return val;
        } catch(e) {
            // do nothing
        }
    }

    // If we get here, we didn't have a value, or didn't have a string.
    return String(default_value);
} //getStringSetting

/// Get a boolean setting from the settings page, which uses HTML5 localStorage.
/// @param setting_name     A value in CFG_NAMES
/// @param default_value    Optional default.  If unspecified or
///                         undefined, the default from CFG_DEFAULTS
///                         is used.
function getBoolSetting(setting_name, default_value = undefined)
{
    if(typeof default_value === 'undefined' && setting_name in CFG_DEFAULTS) {
        default_value = CFG_DEFAULTS[setting_name];
    }

    let locStorageValue = localStorage.getItem(SETTING_PREFIX + setting_name);

    if ( locStorageValue === null ) {   // nonexistent key
        return default_value;
    } else {    // Get the value, which is stored as JSON
        let str = String(locStorageValue).toLowerCase();
        if ( str === "false" ) {
            return false;
        } else if ( str === "true" ) {
            return true;
        } else {
            return default_value;
        }
    }
} //getBoolSetting

/// Find out whether the given setting from the settings page exists.
/// @param setting_name     A value in CFG_NAMES
function haveSetting(setting_name)
{
    if(!setting_name) return false;
    return (SETTING_PREFIX + setting_name) in localStorage;
} //haveSetting()

/// Set a setting (wow!).
/// @param setting_name {String} A value in CFG_NAMES
/// @param setting_value {mixed} The value, which must be
/// JSON.stringify()able.
function setSetting(setting_name, setting_value)
{
    // TODO handle exceptions in some reasonable way.
    localStorage.setItem(
        SETTING_PREFIX + setting_name,
        JSON.stringify(setting_value)
    );  // JSON stringify so we can store more than just strings.
} //setSetting

/// Set a setting only if it's not already there.  Parameters are as
/// setSetting().
function setSettingIfNonexistent(setting_name, setting_value)
{
    if(!haveSetting(setting_name)) setSetting(setting_name, setting_value);
}

/// Custom getter for the current theme name.  This enforces known themes.
function getThemeName()
{
    let theme = getStringSetting(CFG_NAMES.CFGS_THEME_NAME);
    if( theme === 'default' || theme === 'default-dark') return theme;
    else return CFG_DEFAULTS[CFGS_THEME_NAME];
} //getThemeName

////////////////////////////////////////////////////////////////////////// }}}1
// Exports // {{{1

/// The object we will export
let me = {
    // settings
    names: CFG_NAMES,
    defaults: CFG_DEFAULTS,
    validators: CFG_VALIDATORS,

    // special values settings can take on
    OROC_DO: CFG_OROC_DO,
    OROC_DO_NOT: CFG_OROC_DO_NOT,

    // special accessors
    isOROC: ()=>(getStringSetting(CFG_NAMES.CFG_OPEN_REST_ON_CLICK) === CFG_OROC_DO),

    // functions
    getRaw: getRawSetting,
    getString: getStringSetting,
    getBool: getBoolSetting,
    have: haveSetting,
    set: setSetting,
    setIfNonexistent: setSettingIfNonexistent,
    getThemeName
};

// Each of the names is a property directly on the export object,
// with /^CFG/ removed for convenience.
for(let name in CFG_NAMES) {
    me[name.replace(/^CFG_/,'').replace(/^CFG/,'')] = CFG_NAMES[name];
        // CFG_FOO -> FOO; CFGS_FOO -> S_FOO
}

module.exports = me;

////////////////////////////////////////////////////////////////////////// }}}1
// vi: set fo-=o fdm=marker fdl=0: //
