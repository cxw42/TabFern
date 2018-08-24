// common.js: Only constants and stateless helper functions should be
// in this file.
// ** Not currently a require.js module so that it can be used in contexts
// ** where require.js is not available (e.g., background.js).
// ** TODO make this a UMD module?

console.log('TabFern common.js loading');

//////////////////////////////////////////////////////////////////////////
// General constants //

/// The TabFern extension friendly version number.  Displayed in the
/// title bar of the popup window, so lowercase (no shouting!).
const TABFERN_VERSION='0.1.17-pre.3'  //' alpha \u26a0'
    // When you change this, also update:
    //  - manifest.json: both the version and version_name
    //  - package.json
    //  - package-lock.json

// Design decision: version numbers follow semver.org.
// In the Chrome manifest, the version_name attribute tracks the above.
// The version attribute, `x.y.z.w`, which is compared in numeric order L-R,
// is as follows: x.y.z track the above.  w is the "-pre." number.
// A release to the Chrome Web Store has w=1337.
// E.g., 1.2.3-pre.4 is `version='1.2.3.4'`, and 1.2.3 (release) is
// `version='1.2.3.1337'`.
// If you get up to -pre.1336, just bump the `z` value and reset `w` :) .

//////////////////////////////////////////////////////////////////////////
// Messages between parts of TabFern //

// The format of a message is
// { msg: <one of the below constants> [, anything else] }
// For responses, response:true is also included.

const MSG_GET_VIEW_WIN_ID = 'getViewWindowID';
const MSG_EDIT_TAB_NOTE = 'editTabNote';

//////////////////////////////////////////////////////////////////////////
// Names of settings, and their defaults //

/// An array to build the defaults in.  Every property must have a default,
/// since the defaults array is also used to identify properties to be
/// saved/loaded.  The JS types of the defaults must match the types
/// of the properties.
let _DEF = { __proto__: null };

/// An array of validators, used when loading settings.  Each is a function
/// that returns a valid value for that setting, or `undefined` to use the
/// default.  NOTE: returning "undefined" will trigger a warning on the console.
let _VAL = { __proto__: null };
let _vbool = (v)=>{ return ((typeof v === 'boolean')?v:undefined)};

// Booleans
const CFG_ENB_CONTEXT_MENU = 'ContextMenu.Enabled';
_DEF[CFG_ENB_CONTEXT_MENU] = true;
_VAL[CFG_ENB_CONTEXT_MENU] = _vbool;

const CFG_RESTORE_ON_LAST_DELETED = 'open-tree-on-restore-last-deleted';
_DEF[CFG_RESTORE_ON_LAST_DELETED] = false;
_VAL[CFG_RESTORE_ON_LAST_DELETED] = _vbool;

const CFG_JUMP_WITH_SORT_OPEN_TOP = 'jump-to-top-when-sort-open-to-top';
_DEF[CFG_JUMP_WITH_SORT_OPEN_TOP] = true;
_VAL[CFG_JUMP_WITH_SORT_OPEN_TOP] = _vbool;

const CFG_COLLAPSE_ON_STARTUP = 'collapse-trees-on-startup';
_DEF[CFG_COLLAPSE_ON_STARTUP] = true;
_VAL[CFG_COLLAPSE_ON_STARTUP] = _vbool;

const CFG_OPEN_TOP_ON_STARTUP = 'open-to-top-on-startup';
_DEF[CFG_OPEN_TOP_ON_STARTUP] = false;
_VAL[CFG_OPEN_TOP_ON_STARTUP] = _vbool;

const CFG_HIDE_HORIZONTAL_SCROLLBARS = 'hide-horizontal-scrollbars';
_DEF[CFG_HIDE_HORIZONTAL_SCROLLBARS] = true;
_VAL[CFG_HIDE_HORIZONTAL_SCROLLBARS] = _vbool;

const CFG_SKINNY_SCROLLBARS = 'skinny-scrollbars';
_DEF[CFG_SKINNY_SCROLLBARS] = false;
_VAL[CFG_SKINNY_SCROLLBARS] = _vbool;

const CFG_NEW_WINS_AT_TOP = 'open-new-windows-at-top';
_DEF[CFG_NEW_WINS_AT_TOP] = true;
_VAL[CFG_NEW_WINS_AT_TOP] = _vbool;

const CFG_SHOW_TREE_LINES = 'show-tree-lines';
_DEF[CFG_SHOW_TREE_LINES] = false;
_VAL[CFG_SHOW_TREE_LINES] = _vbool;

const CFG_CONFIRM_DEL_OF_SAVED = 'confirm-del-of-saved-wins';
_DEF[CFG_CONFIRM_DEL_OF_SAVED] = true;
_VAL[CFG_CONFIRM_DEL_OF_SAVED] = _vbool;

const CFG_CONFIRM_DEL_OF_UNSAVED = 'confirm-del-of-unsaved-wins';
_DEF[CFG_CONFIRM_DEL_OF_UNSAVED] = false;
_VAL[CFG_CONFIRM_DEL_OF_UNSAVED] = _vbool;

const CFG_CONFIRM_DEL_OF_SAVED_TABS = 'confirm-del-of-saved-tabs';
_DEF[CFG_CONFIRM_DEL_OF_SAVED_TABS] = true;
_VAL[CFG_CONFIRM_DEL_OF_SAVED_TABS] = _vbool;

const CFG_CONFIRM_DEL_OF_UNSAVED_TABS = 'confirm-del-of-unsaved-tabs';
_DEF[CFG_CONFIRM_DEL_OF_UNSAVED_TABS] = false;
_VAL[CFG_CONFIRM_DEL_OF_UNSAVED_TABS] = _vbool;

const CFG_URL_IN_TOOLTIP = 'tooltip-has-url';
_DEF[CFG_URL_IN_TOOLTIP] = false;
_VAL[CFG_URL_IN_TOOLTIP] = _vbool;

const CFG_TITLE_IN_TOOLTIP = 'tooltip-has-title';
_DEF[CFG_TITLE_IN_TOOLTIP] = false;
_VAL[CFG_TITLE_IN_TOOLTIP] = _vbool;

const CFG_PRUNE_NEW_WINDOWS = 'prune-new-windows';
_DEF[CFG_PRUNE_NEW_WINDOWS] = false;
_VAL[CFG_PRUNE_NEW_WINDOWS] = _vbool;

/// Not actually a setting, but an indicator that we loaded settings OK.
/// Used by src/settings/main.js.
const SETTINGS_LOADED_OK = '__settings_loaded_OK';
_DEF[SETTINGS_LOADED_OK] = false;
_VAL[SETTINGS_LOADED_OK] = ()=>{return undefined;}



// Not yet implemented - pending #35.  Whether to open closed tabs when
// you click on the tree item for a partially-open window.
//const CFG_OPEN_REST_ON_CLICK = 'open-rest-on-win-click',
//        CFG_OROC_DO = true,
//        CFG_OROC_DO_NOT = false;
//_DEF[CFG_OPEN_REST_ON_CLICK] = CFG_OROC_DO_NOT;

// Strings, including limited-choice controls such as radio buttons and dropdowns.
const CFGS_BACKGROUND = 'window-background';
_DEF[CFGS_BACKGROUND] = '';
_VAL[CFGS_BACKGROUND] = (v)=>{
    if(!v) return '';
    if(Validation.isValidColor(v)) return v;
    if(Validation.isValidURL(v,
                    ['file', 'https', 'data', 'chrome-extension'])) return v;
    return undefined;
};

const CFGS_THEME_NAME = 'theme-name';
_DEF[CFGS_THEME_NAME] = 'default-dark';
_VAL[CFGS_THEME_NAME] = (v)=>{
    return (( v === 'default-dark' || v === 'default') ? v : undefined);
};

const CFGS_SCROLLBAR_COLOR = 'skinny-scrollbar-color';
_DEF[CFGS_SCROLLBAR_COLOR] = '';
_VAL[CFGS_SCROLLBAR_COLOR] = (v)=>{
    if(!v) return '';
    return ((Validation.isValidColor(v)) ? v : undefined);
};

/// The default values for the configuration settings.
const CFG_DEFAULTS = Object.seal(_DEF);
const CFG_VALIDATORS = Object.seal(_VAL);

//////////////////////////////////////////////////////////////////////////
// Test for Firefox //
// Not sure if I need this, but I'm playing it safe for now.  Firefox returns
// null rather than undefined in chrome.runtime.lastError when there is
// no error.  This is to test for null in Firefox without changing my
// Chrome code.  Hopefully in the future I can test for null/undefined
// in either browser, and get rid of this block.

BROWSER_TYPE=null;  // unknown

(function(win){
    let isLastError_chrome =
        ()=>{return (typeof(chrome.runtime.lastError) !== 'undefined');};
    let isLastError_firefox =
        ()=>{return (chrome.runtime.lastError !== null);};

    if(typeof browser !== 'undefined' && browser.runtime &&
                                            browser.runtime.getBrowserInfo) {
        browser.runtime.getBrowserInfo().then(
            (info)=>{   // fullfillment
                if(info.name === 'Firefox') {
                    win.isLastError = isLastError_firefox;
                    BROWSER_TYPE = 'ff';
                } else {
                    win.isLastError = isLastError_chrome;
                }
            },

            ()=>{   //rejection --- assume Chrome by default
                win.isLastError = isLastError_chrome;
            }
        );
    } else {    // Chrome
        BROWSER_TYPE = 'chrome';
        win.isLastError = isLastError_chrome;
    }
})(window);

//////////////////////////////////////////////////////////////////////////
// Setting-related functions //

const SETTING_PREFIX = 'store.settings.';

/// Get the raw value of a setting.  Returns null if the key doesn't exist.
function getRawSetting(setting_name)
{
    return localStorage.getItem(SETTING_PREFIX + setting_name);
} //getSetting

/// Get the string value of a setting, if it is a string.
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
function haveSetting(setting_name)
{
    if(!setting_name) return false;
    return (SETTING_PREFIX + setting_name) in localStorage;
} //haveSetting()

/// Set a setting (wow!).
/// @param setting_name {String} The name, without the leading SETTING_PREFIX
/// @param setting_value {mixed} The value, which must be JSON.stringifiable.
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

/// Custom getter for theme names.  This enforces known themes.
function getThemeName()
{
    let theme = getStringSetting(CFGS_THEME_NAME);
    if( theme === 'default' || theme === 'default-dark') return theme;
    else return CFG_DEFAULTS[CFGS_THEME_NAME];
} //getThemeName

//////////////////////////////////////////////////////////////////////////
// DOM-related functions //

/// Append a <script> to the <head> of #document.
/// @param {Document} document
/// @param {String} url URL of script to load
/// @param {String} [type] Type of Script tag. Default: text/javascript
/// @param {Function} callback Set as callback for BOTH onreadystatechange and onload
function asyncAppendScriptToHead(document, url, callback, type = 'text/javascript')
{
    // Adding the script tag to the head as suggested before
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = type;
    script.src = url;

    // Then bind the event to the callback function.
    // There are several events for cross browser compatibility.
    script.onreadystatechange = callback;
    script.onload = callback;
    script.onerror = callback;

    // Fire the loading
    head.appendChild(script);
} //asyncAppendScriptToHead()

/// Invoke a callback only when the document is loaded.  Does not pass any
/// parameters to the callback.
function callbackOnLoad(callback)
{
    if(document.readyState !== 'complete') {
        // Thanks to https://stackoverflow.com/a/28093606/2877364 by
        // https://stackoverflow.com/users/4483389/matthias-samsel
        window.addEventListener('load', callback, { 'once': true });
    } else {
        window.setTimeout(callback, 0);    //always async
    }
} //callbackOnLoad

/// Add a CSS file to the specified document.
/// Modified from http://requirejs.org/docs/faq-advanced.html#css
/// @param doc {DOM Document}
/// @param url {String}
/// @param before {DOM Node} Optional --- if provided, the new sheet
/// will be inserted before #before.
function loadCSS(doc, url, before) {
    let link = doc.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = url;
    let head = document.getElementsByTagName("head")[0];
    if(before) {
        head.insertBefore(link, before);
    } else {
        head.appendChild(link);
    }
} //loadCSS

//////////////////////////////////////////////////////////////////////////
// Miscellaneous functions //

/// Shortcut for i18n.  Call _T("name") to pull the localized "name".
var _T = chrome.i18n.getMessage;

/// Ignore a Chrome callback error, and suppress Chrome's
/// `runtime.lastError` diagnostic.  Use this as a Chrome callback.
function ignore_chrome_error() { void chrome.runtime.lastError; }

/// Deep-compare two objects for memberwise equality.  However, if either
/// object contains a pointer to the other, this will return false rather
/// than getting stuck in a loop.  Non-`object` types are compared by ===.
/// All member comparisons are ===.
/// @param obj1 An object to compare
/// @param obj2 The other object to compare
/// Modified from https://gist.github.com/nicbell/6081098 by
/// https://gist.github.com/nicbell
function ObjectCompare(obj1, obj2) {
    if( (typeof obj1 !== 'object') || (typeof obj2 !== 'object') ) {
        return obj1 === obj2;
    }

    //Loop through properties in object 1
    for (var p in obj1) {
        //Check property exists on both objects
        if (obj1.hasOwnProperty(p) !== obj2.hasOwnProperty(p)) return false;

        switch (typeof (obj1[p])) {

            //Deep compare objects
            case 'object':
                //Check for circularity
                if( (obj1[p]===obj2) || (obj2[p]===obj1) ) return false;

                if (!ObjectCompare(obj1[p], obj2[p])) return false;
                break;

            //Compare function code
            case 'function':
                if (typeof (obj2[p]) == 'undefined' ||
                    (obj1[p].toString() !== obj2[p].toString())) {
                    return false;
                }
                break;

            //Compare values
            default:
                if (obj1[p] !== obj2[p]) return false;
        }
    }

    //Check object 2 for any extra properties
    for (var p in obj2) {
        if (typeof (obj1[p]) === 'undefined') return false;
    }
    return true;
} //ObjectCompare

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
