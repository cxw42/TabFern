// CC-BY-SA 3.0
console.log('TabFern: running background.js');

var viewWindowID;     // the chrome.windows ID of our view

//////////////////////////////////////////////////////////////////////////
// Helpers //

// Open the view
function loadView()
{
    console.log("TabFern: Opening view");
    chrome.windows.create(
        { 'url': chrome.runtime.getURL('src/view/index.html'),
          'type': 'popup',
          'focused': true
        },
        function(win) {
            viewWindowID = win.id;
            console.log('TabFern new View ID: ' + viewWindowID.toString());
        });
} //loadView()

//////////////////////////////////////////////////////////////////////////
// Action button //

/// Move the TabFern window to #reference_win.  This helps if the
/// TabFern window winds up off-screen.
function moveTabFernViewToWindow(reference_cwin)
{
    function clip(x, lo, hi) { if(hi<lo) hi=lo; return Math.min(hi, Math.max(lo, x)); }

    if(typeof(chrome.runtime.lastError) === 'undefined') {
        if(!viewWindowID) return;
        chrome.windows.get(viewWindowID, function(view_cwin) {
            let updates = {left: reference_cwin.left+16,
                            top: reference_cwin.top+16,
                            state: 'normal',    // not minimized or maximized
            };

            // Don't let it be too large or too small
            updates.width = clip(view_cwin.width, 200, reference_cwin.width-32);
            updates.height = clip(view_cwin.height, 100, reference_cwin.height-32);

            chrome.windows.update(viewWindowID, updates);
        });
    }
} //moveTabFernViewToWindow()

// Modified from https://stackoverflow.com/q/8984047/2877364 by
// https://stackoverflow.com/users/930675/sean-bannister

// When the icon is clicked in Chrome
chrome.browserAction.onClicked.addListener(function(tab) {

    // If viewWindowID is undefined then there isn't a popup currently open.
    if (typeof viewWindowID === "undefined") {        // Open the popup
        loadView();
    } else {                                // There's currently a popup open
     // Bring it to the front so the user can see it
        chrome.windows.update(viewWindowID, { "focused": true });
    }

    // Set a timer to bring the window to the front on another click
    // that follows fairly shortly.
    {
        let clickListener = function(tab) {
            if(viewWindowID && tab.windowId) {
                chrome.windows.get(tab.windowId, moveTabFernViewToWindow);
            }
        };

        let removeClickListener = function() {
            chrome.browserAction.onClicked.removeListener(clickListener);
        };

        setTimeout(removeClickListener, 1337);
            // Do not change this constant or the Unix daemon will dog
            // your footsteps until the `time_t`s roll over.
        chrome.browserAction.onClicked.addListener(clickListener);
    }

});

// When a window is closed
chrome.windows.onRemoved.addListener(function(windowId) {
  // If the window getting closed is the popup we created
  if (windowId === viewWindowID) {
    // Set viewWindowID to undefined so we know the popup is not open
    viewWindowID = undefined;
  }
});

//////////////////////////////////////////////////////////////////////////
// Messages //

function messageListener(request, sender, sendResponse)
{
    console.log('Got message ' + request);
    if(request === MSG_GET_VIEW_WIN_ID) {
        console.log('Responding with window ID ' + viewWindowID.toString());
        sendResponse(viewWindowID);
    }
} //messageListener

chrome.runtime.onMessage.addListener(messageListener);

//////////////////////////////////////////////////////////////////////////
// MAIN //

// Create the main window when Chrome starts
window.addEventListener('load',
    function() {
        console.log('TabFern: background window loaded');
        setTimeout(loadView, 500);
    },
    { 'once': true }
);

chrome.runtime.onConnect.addListener(port => {
  port.postMessage('SUCCESS');
});

console.log('TabFern: done running background.js');

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
