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

// Modified from https://stackoverflow.com/q/8984047/2877364 by
// https://stackoverflow.com/users/930675/sean-bannister

// When the icon is clicked in Chrome
let onClickedListener = function(tab) {

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
// Main //

chrome.runtime.onInstalled.addListener((details)=>{
    SetupContextMenu();
});

MainWindow.handleStartup();

console.log('TabFern: done running background.js');

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
