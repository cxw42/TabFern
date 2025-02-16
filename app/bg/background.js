// background.js: background script for TabFern.  Runs as a module.
// CC-BY-SA 3.0
console.log('TabFern: running ' + __filename);

if(false) { // Vendor files - listed here only so they'll be bundled
    require('vendor/validation');
    require('vendor/common');
    require('asynquence');
    require('asynquence-contrib');

    // The following require() seems to fix the 'cannot find module "process"
    // from "/"' error mentioned at
    // https://github.com/cxw42/TabFern/issues/100#issuecomment-450058252
    // and discussed further at
    // https://github.com/cxw42/TabFern/issues/100#issuecomment-513267574 .
    require('process/browser');
}

let ASQH = require('lib/asq-helpers');
const SD = require('common/setting-definitions');

/// The module exports, for use in command-line debugging
let me = {
    viewWindowId: undefined,    // the chrome.windows ID of our view
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
          'left': 10,
          'top': 10,
          'width': 200,
          'height': 200,
          //'focused': true
            // Note: `focused` is not supported on Firefox, but
            // focused=true is usually the effect.
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1253129
            // However, Firefox does support windows.update with focused.
        },
        function(win) {
            me.viewWindowId = win.id;
            console.log('TabFern new View ID: ' + me.viewWindowId.toString());
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
        if(!me.viewWindowId) return;
        chrome.windows.get(me.viewWindowId, function(view_cwin) {
            // TODO handle Chrome error
            let updates = {left: reference_cwin.left+16,
                            top: reference_cwin.top+16,
                            state: 'normal',    // not minimized or maximized
            };

            // Don't let it be too large or too small
            updates.width = clip(view_cwin.width, 200, reference_cwin.width-32);
            updates.height = clip(view_cwin.height, 100, reference_cwin.height-32);

            chrome.windows.update(me.viewWindowId, updates
                // TODO handle Chrome error
                );
        });
    }
} //moveTabFernViewToWindow()

// Modified from https://stackoverflow.com/q/8984047/2877364 by
// https://stackoverflow.com/users/930675/sean-bannister

// When the icon is clicked in Chrome
let onClickedListener = function(tab) {

    // If viewWindowId is undefined then there isn't a popup currently open.
    if (typeof me.viewWindowId === "undefined") {        // Open the popup
        me.loadView();
    } else {                                // There's currently a popup open
     // Bring it to the front so the user can see it
        chrome.windows.update(me.viewWindowId, { "focused": true });
    }

    // Set a timer to bring the window to the front on another click
    // that follows fairly shortly.
    if(tab) {
        let clickListener = function(tab) {
            if(me.viewWindowId && tab.windowId) {
                chrome.windows.get(tab.windowId, moveTabFernViewToWindow);
            }
        };

        let removeClickListener = function() {
            chrome.action.onClicked.removeListener(clickListener);
        };

        setTimeout(removeClickListener, 1337);
            // Do not change this constant or the Unix daemon will dog
            // your footsteps until the `time_t`s roll over.
        chrome.action.onClicked.addListener(clickListener);
    }

} //onClickedListener()

chrome.action.onClicked.addListener(onClickedListener);

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
  if (windowId === me.viewWindowId) {
    // Set viewWindowId to undefined so we know the popup is not open
    me.viewWindowId = undefined;
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
                    lastBrowserErrorMessageString());
            } else {
                console.log({[`response to edit-note for ${tab.id}`]: resp});
            }
        }
    );
} //editNoteOnClick

chrome.contextMenus.create({
    id: 'editNote', title: _T('menuAddEditNoteThisTab'),
    contexts: ['browser_action'],
});
chrome.contextMenus.onClicked.addListener(editNoteOnClick);

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
        console.log('Responding with window ID ' + me.viewWindowId.toString());
        sendResponse({msg: request.msg, response: true, id: me.viewWindowId});
    }

    if(request.msg === MSG_REPORT_POPUP_SETTING && !request.response) {
        console.log('Responding');
        sendResponse({msg: request.msg, response: true});

        openMainWindowIfNecessary(request.shouldOpenPopup);
    }

} //messageListener

chrome.runtime.onMessage.addListener(messageListener);

async function openMainWindowIfNecessary(shouldOpen)
{
    // See if it's time to open the main window
    const hadPopupValue = await chrome.storage.local.get(SD.names.CFG_POPUP_ON_STARTUP);
    await chrome.storage.local.set({[SD.names.CFG_POPUP_ON_STARTUP]: shouldOpen});

    if(shouldOpen && !hadPopupValue[SD.names.CFG_POPUP_ON_STARTUP]) {
        console.log('Triggering open of main window')
        openMainWindow();
    }
}

//////////////////////////////////////////////////////////////////////////
// MAIN //

// Create the main window when Chrome starts.
function openMainWindow()
{
    console.log('TabFern: checking whether to main window');

    // Promises are not available until Chrome 95+, and I'm only requiring
    // Chrome 88.  Therefore, use the callback style.

    ASQH.NowCC((cbk)=>{ chrome.storage.local.get(SD.names.CFG_POPUP_ON_STARTUP, cbk); })
    .then((done, value) => {
        if(value && value[SD.names.CFG_POPUP_ON_STARTUP]) {
            console.log('Opening popup window');
            setTimeout(me.loadView, 500);
        }
    });
} //openMainWindow

// Modified from
// <https://developer.chrome.com/docs/extensions/reference/api/offscreen#maintain_the_lifecycle_of_an_offscreen_document>
async function setupOffscreenDocument(path)
{
    // Check all windows controlled by the service worker to see if one
    // of them is the offscreen document with the given path
    const offscreenUrl = chrome.runtime.getURL(path);
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
    });

    if (existingContexts.length > 0) {
        return;
    }

    // create offscreen document
    await chrome.offscreen.createDocument({
        url: path,
        reasons: [chrome.offscreen.Reason.LOCAL_STORAGE],
        justification: 'Copy localStorage values this script needs into chrome.storage.local',
    });
} //setupOffscreenDocument()

// Open the main window.  This won't do anything if this is the first time we
// are loading after updating to MV3.
openMainWindow();

// TODO don't do this if we are already on MV3.
setupOffscreenDocument('mv3-converter/mv3-converter.html');

console.log('TabFern: done running background.js');

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
