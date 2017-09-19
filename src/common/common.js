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
const TABFERN_VERSION='0.1.7 alpha \u26a0'
    // Don't forget to update BOTH the version and version_name in
    // manifest.json when you change this!

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

const MSG_GET_VIEW_WIN_ID = 'getViewWindowID';

//////////////////////////////////////////////////////////////////////////
// Names of settings //

const CFG_RESTORE_ON_LAST_DELETED = "open-tree-on-restore-last-deleted";

//////////////////////////////////////////////////////////////////////////
// Helper functions //

const SETTING_PREFIX = 'store.settings.';

/// Find out whether the given setting from options_custom exists.
function haveSetting(setting_name)
{
    if(!setting_name) return false;
    return (SETTING_PREFIX + setting_name) in localStorage;
} //haveSetting()

/// Get a boolean setting from options_custom, which uses HTML5 localStorage.
function getBoolSetting(setting_name, default_value = false)
{
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
