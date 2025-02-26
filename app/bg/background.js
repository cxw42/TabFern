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

const SetupContextMenu = require('bg/context-menu');
const MainWindow = require('bg/main-window');

module.exports = {};

let me = {}; // XXX

//////////////////////////////////////////////////////////////////////////
// Action button //

/// Move the TabFern window to #reference_win.  This helps if the
/// TabFern window winds up off-screen.
/// This is called as a Chrome callback.
function moveTabFernViewToWindow(reference_cwin)
{
    function clip(x, lo, hi) { if(hi<lo) hi=lo; return Math.min(hi, Math.max(lo, x)); }

    if(!isLastError()) {
        return; // TODO
        if(!me.viewWindowId) return;
        ASQH.NowCC((cbk)=>{
            chrome.storage.session.get(SD.names.VIEW_WIN_ID_KEY, cbk);
        })
        .then((done, result)=>{
            chrome.windows.get(result[SD.names.VIEW_WIN_ID_KEY], ASQH.CC(done));
        })
        .then((done, view_cwin)=>{
            let updates = {left: reference_cwin.left+16,
                            top: reference_cwin.top+16,
                            state: 'normal',    // not minimized or maximized
            };

            // Don't let it be too large or too small
            updates.width = clip(view_cwin.width, 200, reference_cwin.width-32);
            updates.height = clip(view_cwin.height, 100, reference_cwin.height-32);

            chrome.windows.update(me.viewWindowId, updates, ASQH.CC(done));
        })
        // TODO handle Chrome error?
        ;
    }
} //moveTabFernViewToWindow()

// Modified from https://stackoverflow.com/q/8984047/2877364 by
// https://stackoverflow.com/users/930675/sean-bannister

// When the icon is clicked in Chrome
let onClickedListener = function(tab) {

    return; // TODO
    // If viewWindowId is undefined then there isn't a popup currently open.
    if (typeof me.viewWindowId === "undefined") {        // Open the popup
        loadView();
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
        ASQH.NowCC((cbk)=>{
            chrome.storage.session.get(SD.names.VIEW_WIN_ID_KEY, cbk);
        })
        .then((done, result)=>{
            const winId = result[SD.names.VIEW_WIN_ID_KEY];
            console.log('Responding with window ID ' + winId.toString());
            // If the window getting closed is the popup we created
            sendResponse({msg: request.msg, response: true, id: winId});
        })
        ;

        return true;    // tell Chrome we'll be responding asynchronously
    }


} //messageListener

chrome.runtime.onMessage.addListener(messageListener);

chrome.runtime.onInstalled.addListener((details)=>{
    SetupContextMenu();
});

MainWindow.handleStartup();

console.log('TabFern: done running background.js');

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
