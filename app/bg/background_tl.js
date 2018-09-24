// CC-BY-SA 3.0
console.log('TabFern tfbrunch: running background.js');

var viewWindowID;     // the chrome.windows ID of our view

//////////////////////////////////////////////////////////////////////////
// Helpers //

/// Ignore a Chrome callback error, and suppress Chrome's
/// `runtime.lastError` diagnostic.  Use this as a Chrome callback.
function ignore_chrome_error() { void chrome.runtime.lastError; }

// Open the view
function loadView()
{
    console.log("TabFern: Opening view");
    chrome.windows.create(
        {   'url': chrome.runtime.getURL('win/main.html'),
            'type': 'popup',
            //'focused': true
                // Note: `focused` is not supported on Firefox, but
                // focused=true is usually the effect.
                // https://bugzilla.mozilla.org/show_bug.cgi?id=1253129
                // However, Firefox does support windows.update with focused.
            top: 0,
            left: 0,
            width: 400,
            height: 400,
        },
        function(win) {
            viewWindowID = win.id;
            console.log('TabFern new View ID: ' + viewWindowID.toString());
            chrome.windows.update(win.id, {focused:true}, ignore_chrome_error);
        });
} //loadView()

//////////////////////////////////////////////////////////////////////////
// Action button //

// Modified from https://stackoverflow.com/q/8984047/2877364 by
// https://stackoverflow.com/users/930675/sean-bannister

// When the icon is clicked in Chrome
let onClickedListener = function(tab) {

    // If viewWindowID is undefined then there isn't a popup currently open.
    if (typeof viewWindowID === "undefined") {        // Open the popup
        loadView();
    } else {                                // There's currently a popup open
     // Bring it to the front so the user can see it
        chrome.windows.update(viewWindowID, { "focused": true });
    }

} //onClickedListener()

chrome.browserAction.onClicked.addListener(onClickedListener);

// When a window is closed
chrome.windows.onRemoved.addListener(function(windowId) {
  // If the window getting closed is the popup we created
  if (windowId === viewWindowID) {
    // Set viewWindowID to undefined so we know the popup is not open
    viewWindowID = undefined;
  }
});

//////////////////////////////////////////////////////////////////////////
// MAIN //

// Create the main window when Chrome starts
window.addEventListener('load',
    function() {
        console.log('TabFern: background window loaded');
        console.log('Opening popup window');
        setTimeout(loadView, 500);
    },
    { 'once': true }
);

console.log('TabFern: done running background.js');

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
