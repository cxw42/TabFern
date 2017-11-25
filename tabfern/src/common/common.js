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
const TABFERN_VERSION='0.1.13 alpha \u26a0'
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

// Booleans
const CFG_ENB_CONTEXT_MENU = 'ContextMenu.Enabled';
const CFG_RESTORE_ON_LAST_DELETED = 'open-tree-on-restore-last-deleted';
const CFG_JUMP_WITH_SORT_OPEN_TOP = 'jump-to-top-when-sort-open-to-top';
const CFG_COLLAPSE_ON_STARTUP = 'collapse-trees-on-startup';
const CFG_OPEN_TOP_ON_STARTUP = 'open-to-top-on-startup';
const CFG_HIDE_HORIZONTAL_SCROLLBARS = 'hide-horizontal-scrollbars';
const CFG_SKINNY_SCROLLBARS = 'skinny-scrollbars';
const CFG_NEW_WINS_AT_TOP = 'open-new-windows-at-top';
const CFG_SHOW_TREE_LINES = 'show-tree-lines';
const CFG_CONFIRM_DEL_OF_SAVED = 'confirm-del-of-saved-wins';
const CFG_CONFIRM_DEL_OF_UNSAVED = 'confirm-del-of-unsaved-wins';

// Strings
const CFGS_BACKGROUND = 'window-background';

// Other
const CFGS_THEME_NAME = 'theme-name';

const CFG_DEFAULTS = {
    __proto__: null,
    [CFG_ENB_CONTEXT_MENU]: true,
    [CFG_RESTORE_ON_LAST_DELETED]: false,
    [CFG_JUMP_WITH_SORT_OPEN_TOP]: true,
    [CFG_COLLAPSE_ON_STARTUP]: true,
    [CFG_OPEN_TOP_ON_STARTUP]: false,
    [CFG_HIDE_HORIZONTAL_SCROLLBARS]: true,
    [CFG_SKINNY_SCROLLBARS]: false,
    [CFG_NEW_WINS_AT_TOP]: false,
    [CFG_SHOW_TREE_LINES]: false,
    [CFG_CONFIRM_DEL_OF_SAVED]: true,
    [CFG_CONFIRM_DEL_OF_UNSAVED]: false,
    [CFGS_THEME_NAME]: 'default-dark',
};

//////////////////////////////////////////////////////////////////////////
// Setting-related functions //

const SETTING_PREFIX = 'store.settings.';

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

/// Get a boolean setting from options_custom, which uses HTML5 localStorage.
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

/// Find out whether the given setting from options_custom exists.
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
    localStorage.setItem(
        SETTING_PREFIX + setting_name,
        JSON.stringify(setting_value)
    );
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
