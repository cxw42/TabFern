// background.js: background script for TabFern.  Runs as a module.
// CC-BY-SA 3.0
console.log("TabFern: running " + __filename);

if (false) {
    // Vendor files - listed here only so they'll be bundled
    require("vendor/validation");
    require("vendor/common");
    require("asynquence");
    require("asynquence-contrib");

    // The following require() seems to fix the 'cannot find module "process"
    // from "/"' error mentioned at
    // https://github.com/cxw42/TabFern/issues/100#issuecomment-450058252
    // and discussed further at
    // https://github.com/cxw42/TabFern/issues/100#issuecomment-513267574 .
    require("process/browser");
}

const SetupContextMenu = require("bg/context-menu");
const MainWindow = require("bg/main-window");
const SetupOffscreenDocument = require("bg/offscreen-document");

//////////////////////////////////////////////////////////////////////////
// Action button //

// Modified from https://stackoverflow.com/q/8984047/2877364 by
// https://stackoverflow.com/users/930675/sean-bannister

// When the icon is clicked in Chrome
function onActionClicked(ctab) {
    console.log({ ["Action clicked"]: ctab });

    // Bring it to the front so the user can see it
    MainWindow.raiseOrLoadView();

    if (!ctab || !ctab.windowId) {
        // Came from onCommand --- nothing else to do
        return;
    }

    // Prepare to respond to a double-click by bringing the TF window
    // to the current tab.

    // Enable the double-click behaviour...
    chrome.action.onClicked.addListener(MainWindow.bringToTab);

    // ...until the following timeout fires.  It's OK to use setTimeout here
    // per <https://github.com/w3c/webextensions/issues/196>.
    setTimeout(
        () => {
            chrome.action.onClicked.removeListener(MainWindow.bringToTab);
        },
        1337
        // Do not change this constant or the Unix daemon will dog
        // your footsteps until the `time_t`s roll over.
    );
} //onActionClicked()

// This fires for both clicks on the extension's icon and presses of
// any keyboard shortcut assigned to "Activate the extension".
chrome.action.onClicked.addListener(onActionClicked);

function onCommandReceived(cmd) {
    console.log("Received command " + cmd);
    if (cmd == "reveal-view") {
        onActionClicked(null); // null => no tab, so no summon
    }
} //onCommandReceived()

// This fires for presses of a (possibly global) hotkey assigned to
// "Open the TabFern window".
chrome.commands.onCommand.addListener(onCommandReceived);

//////////////////////////////////////////////////////////////////////////
// Main-window creation //

// A listener that will trigger opening the main window if we hear
// from the offscreen document that localStorage says we should.
function offscreenDocumentMessageListener(message, sender, sendResponse) {
    if (
        !message ||
        !message.msg ||
        !sender.id ||
        sender.id !== chrome.runtime.id ||
        message.msg !== MSG_REPORT_POPUP_SETTING ||
        message.response
    ) {
        // Message we don't care about --- ignore
        return;
    }

    console.log("Responding to popup-setting report");
    sendResponse({ msg: message.msg, response: true });

    if (message.shouldOpenPopup) {
        MainWindow.raiseOrLoadView();
    }
} //offscreenDocumentMessageListener()

//////////////////////////////////////////////////////////////////////////
// Main //

chrome.runtime.onInstalled.addListener(SetupContextMenu);

// Do this before loading the offscreen document
chrome.runtime.onMessage.addListener(offscreenDocumentMessageListener);

// Processing continues in the offscreen document
SetupOffscreenDocument();

console.log("TabFern: done running background.js");

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
