// background.js: background script for TabFern.  Runs as a module.
// CC-BY-SA 3.0
console.log('TabFern: running ' + __filename);

if(false) { // Vendor files - listed here only so they'll be bundled
    require('vendor/validation');
    require('vendor/common');
}

const S = require('common/setting-definitions');    // in app/

/// The module exports, for use in command-line debugging
let me = {
    viewWindowID: undefined,    // the chrome.windows ID of our view
    loadView: undefined,
};

module.exports = me;


//////////////////////////////////////////////////////////////////////////
// Helpers //

// Open the view
me.loadView = function loadView()
{
    console.log("TabFern: Opening view");
    chrome.windows.create(
        { 'url': chrome.runtime.getURL('win/container.html'),
          'type': 'popup',
          //'focused': true
            // Note: `focused` is not supported on Firefox, but
            // focused=true is usually the effect.
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1253129
            // However, Firefox does support windows.update with focused.
        },
        function(win) {
            me.viewWindowID = win.id;
            console.log('TabFern new View ID: ' + me.viewWindowID.toString());
            chrome.windows.update(win.id, {focused:true}, ignore_chrome_error);
        });
} //loadView()

//////////////////////////////////////////////////////////////////////////
// Action button //

/// Move the TabFern window to #reference_win.  This helps if the
/// TabFern window winds up off-screen.
/// This is called as a Chrome callback.
function moveTabFernViewToWindow(reference_cwin)
{
    function clip(x, lo, hi) { if(hi<lo) hi=lo; return Math.min(hi, Math.max(lo, x)); }

    if(!isLastError()) {
        if(!me.viewWindowID) return;
        chrome.windows.get(me.viewWindowID, function(view_cwin) {
            // TODO handle Chrome error
            let updates = {left: reference_cwin.left+16,
                            top: reference_cwin.top+16,
                            state: 'normal',    // not minimized or maximized
            };

            // Don't let it be too large or too small
            updates.width = clip(view_cwin.width, 200, reference_cwin.width-32);
            updates.height = clip(view_cwin.height, 100, reference_cwin.height-32);

            chrome.windows.update(me.viewWindowID, updates
                // TODO handle Chrome error
                );
        });
    }
} //moveTabFernViewToWindow()

// Modified from https://stackoverflow.com/q/8984047/2877364 by
// https://stackoverflow.com/users/930675/sean-bannister

// When the icon is clicked in Chrome
let onClickedListener = function(tab) {

    // If viewWindowID is undefined then there isn't a popup currently open.
    if (typeof me.viewWindowID === "undefined") {        // Open the popup
        me.loadView();
    } else {                                // There's currently a popup open
     // Bring it to the front so the user can see it
        chrome.windows.update(me.viewWindowID, { "focused": true });
    }

    // Set a timer to bring the window to the front on another click
    // that follows fairly shortly.
    if(tab) {
        let clickListener = function(tab) {
            if(me.viewWindowID && tab.windowId) {
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

} //onClickedListener()

chrome.browserAction.onClicked.addListener(onClickedListener);

let onCommandListener = function(cmd) {
    console.log("Received command " + cmd);
    if(cmd == 'reveal-view') {
        onClickedListener(null);    // null => no tab, so no summon
    }
} //onCommandListener()
chrome.commands.onCommand.addListener(onCommandListener);

// When a window is closed
chrome.windows.onRemoved.addListener(function(windowId) {
  // If the window getting closed is the popup we created
  if (windowId === me.viewWindowID) {
    // Set viewWindowID to undefined so we know the popup is not open
    me.viewWindowID = undefined;
    console.log('Popup window was closed');
  }
});

//////////////////////////////////////////////////////////////////////////
// Action button context-menu items //

function editNoteOnClick(info, tab)
{
    console.log({editNoteOnClick:info, tab});
    if(!tab.id) return;
    console.log(`Sending editNote for ${tab.id}`);
    chrome.runtime.sendMessage({msg:MSG_EDIT_TAB_NOTE, tab_id: tab.id},
        // This callback is only for debugging --- all the action happens in
        // src/view/tree.js, the receiver.
        function(resp){
            if(isLastError()) {
                console.log('Couldn\'t send edit-note to ' + tab.id + ': ' +
                    chrome.runtime.lastError);
            } else {
                console.log({[`response to edit-note for ${tab.id}`]: resp});
            }
        }
    );
} //editNoteOnClick

chrome.contextMenus.create({
    id: 'editNote', title: _T('menuAddEditNoteThisTab'),
    contexts: ['browser_action'], onclick: editNoteOnClick
});

//////////////////////////////////////////////////////////////////////////
// Messages //

function messageListener(request, sender, sendResponse)
{
    console.log({'bg got message':request,from:sender});
    if(!request || !request.msg) {
        console.log('bg   Bad request');
        return;
    }

    // For now, only accept messages from our extension
    if(!sender.id || sender.id !== chrome.runtime.id) {
        console.log(`bg   Bad id ${sender.id} (ours ${chrome.runtime.id})`);
        return;
    }

    if(request.msg === MSG_GET_VIEW_WIN_ID && !request.response) {
        console.log('Responding with window ID ' + me.viewWindowID.toString());
        sendResponse({msg: request.msg, response: true, id: me.viewWindowID});
    }
} //messageListener

chrome.runtime.onMessage.addListener(messageListener);

//////////////////////////////////////////////////////////////////////////
// MAIN //

// Create the main window when Chrome starts
if(true) {
    callbackOnLoad(
        function() {
            console.log('TabFern: background window loaded');
            if(S.getBool(S.POPUP_ON_STARTUP)) {
                console.log('Opening popup window');
                setTimeout(me.loadView, 500);
            }
        }
    );
}

// Set the defaults for the options.  The settings boilerplate from
// extensionizr does not appear to have this facility.
for(let opt in S.defaults) {
    S.setIfNonexistent(opt, S.defaults[opt]);
}

S.set(S.PRUNE_NEW_WINDOWS, false);  // don't prune - it's a Chrome bug
    // See https://bugs.chromium.org/p/chromium/issues/detail?id=883709#c16

console.log('TabFern: done running background.js');

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
