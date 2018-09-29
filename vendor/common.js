// common.js: Only constants and stateless helper functions should be
// in this file.
// ** Not currently a require.js module so that it can be used in contexts
// ** where require.js is not available (e.g., background.js).
// ** TODO split this into UMD modules so the pieces can be loaded with or
//    without require.js.

console.log('TabFern common.js loading');

// Messages between parts of TabFern // {{{1

// The format of a message is
// { msg: <one of the below constants> [, anything else] }
// For responses, response:true is also included.

const MSG_GET_VIEW_WIN_ID = 'getViewWindowID';
const MSG_EDIT_TAB_NOTE = 'editTabNote';

////////////////////////////////////////////////////////////////////////// }}}1
// Test for Firefox // {{{1
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

////////////////////////////////////////////////////////////////////////// }}}1
// DOM-related functions // {{{1

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
        window.addEventListener('load', ()=>{ callback(); }, { 'once': true });
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

////////////////////////////////////////////////////////////////////////// }}}1
// Miscellaneous functions // {{{1

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

/// }}}1
// vi: set ts=4 sts=4 sw=4 et ai fo-=o fdm=marker fdl=0: //
