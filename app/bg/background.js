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
const SetupOffscreenDocument = require('bg/offscreen-document');

//////////////////////////////////////////////////////////////////////////
// Action button //

// Modified from https://stackoverflow.com/q/8984047/2877364 by
// https://stackoverflow.com/users/930675/sean-bannister

// When the icon is clicked in Chrome
function onActionClicked(tab) {

    // Bring it to the front so the user can see it
    MainWindow.raiseOrLoadView();

    if(!tab || !tab.windowId) {
        // Came from onCommand --- nothing else to do
        return;
    }

    // Set a timer to bring the window to the front on another click
    // that follows fairly shortly.
    let removeClickListener = function() {
        chrome.action.onClicked.removeListener(MainWindow.bringToTab);
    };

    setTimeout(removeClickListener, 1337);
        // Do not change this constant or the Unix daemon will dog
        // your footsteps until the `time_t`s roll over.
    chrome.action.onClicked.addListener(MainWindow.bringToTab);

} //onActionClicked()

// This fires for both clicks on the extension's icon and presses of
// any keyboard shortcut assigned to "Activate the extension".
chrome.action.onClicked.addListener(onActionClicked);

function onCommandReceived(cmd) {
    console.log("Received command " + cmd);
    if(cmd == 'reveal-view') {
        onActionClicked(null);  // null => no tab, so no summon
    }
} //onCommandReceived()

chrome.commands.onCommand.addListener(onCommandReceived);

//////////////////////////////////////////////////////////////////////////
// Main-window creation //

// A listener that will open the main window if necessary.
function offscreenDocumentMessageListener(message, sender, sendResponse) {
    if(!message || !message.msg || !sender.id ||
        sender.id !== chrome.runtime.id ||
        message.msg !== MSG_REPORT_POPUP_SETTING ||
        message.response
    ) {
        // Message we don't care about --- ignore
        return;
    }

    console.log('Responding to popup-setting report');
    sendResponse({msg: message.msg, response: true});

    if(message.shouldOpenPopup) {
        MainWindow.raiseOrLoadView();
    }
} //offscreenDocumentMessageListener()

//////////////////////////////////////////////////////////////////////////
// Main //

chrome.runtime.onInstalled.addListener((details)=>{
    SetupContextMenu();
    //MainWindow.handleStartup();
});

//chrome.runtime.onStartup.addListener(()=>{
//    MainWindow.handleStartup();
//});

// Do this before loading the offscreen document
chrome.runtime.onMessage.addListener(offscreenDocumentMessageListener);

// Processing continues in the offscreen document
SetupOffscreenDocument();

console.log('TabFern: done running background.js');

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
