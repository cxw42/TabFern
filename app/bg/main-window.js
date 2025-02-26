// app/bg/main-window.js: service-worker code to open the main window
// CC-BY-SA 3.0
//
// NOTE: Promises are not available until Chrome 95+, and I'm only requiring
// Chrome 88.  Therefore, use the callback style.

if(false) { // Vendor files - listed here only so they'll be bundled
    require('vendor/common');
}

let ASQ = require('asynquence-contrib');
let ASQH = require('lib/asq-helpers');

const SD = require('common/setting-definitions');

const WIN_URL = chrome.runtime.getURL('win/container.html');
const OFFSCREEN_DOC_URL = chrome.runtime.getURL('mv3-converter/mv3-converter.html');

// Actually open the view, i.e., the main TF window
function loadView()
{
    ASQH.NowCC((cbk) => {
        console.log("TabFern: Opening view");
        chrome.windows.create(
            { 'url': WIN_URL,
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
            cbk
        );
    })
    .or((err)=>{
        console.error(`Could not open TF window: ${err}`);
    })
    .val((winId)=> {
        chrome.windows.update(winId, {focused:true}, ignore_chrome_error);
    });
} //loadView()

// Focus the view if it's open, or else load the view.
function raiseOrLoadView()
{
    ASQH.NowCC((cbk) => {
        console.log("TabFern: Raising or opening view");
        chrome.tabs.query({windowType: "popup"}, cbk)
    })
    .then((done, tabs) => {
        for(const tab of tabs) {
            if(tab.url === WIN_URL) {
                done(tab.windowId);
                return;
            }
        }

        // Not already open --- let loadView do the work.
        loadView();
    })
    .then((done, winId) => {
        // Already open --- raise it
        chrome.windows.update(winId, {focused: true}, ignore_chrome_error);
    });
} //raiseOrLoadView()

// Set up an offscreen document.  Modified from
// <https://developer.chrome.com/docs/extensions/reference/api/offscreen#maintain_the_lifecycle_of_an_offscreen_document>
function setupOffscreenDocument(offscreenUrl)
{
    // Check all windows controlled by the service worker to see if one
    // of them is the offscreen document with the given path
    ASQH.NowCC((cbk)=>{
        chrome.runtime.getContexts(
            {
                contextTypes: ['OFFSCREEN_DOCUMENT'],
                documentUrls: [offscreenUrl]
            },
            cbk
        );
    })
    .then((done, existingContexts)=>{
        if (existingContexts.length == 0) {
            // Need to create a document
            done();
        }
    })
    .then((done)=>{
        chrome.offscreen.createDocument(
            {
                url: path,
                reasons: [chrome.offscreen.Reason.LOCAL_STORAGE],
                justification: 'Copy localStorage values this script needs into chrome.storage.local',
            },
            ASQH.CC(done)
        );
    })
    .or((err)=>{
        console.error(`Could not set up offscreen document: ${err}`);
    });
} //setupOffscreenDocument()

// Create a listener that will open the main window if necessary.
function createOffscreenDocumentMessageListener(done)
{
    return function offscreenDocumentMessageListener(message, sender, sendResponse) {
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
            chrome.storage.local.set(
                {[SD.names.CFG_POPUP_ON_STARTUP]: message.shouldOpenPopup},
                ASQH.CC(done)
            );
        }

        // We only need to process this message once.
        chrome.runtime.onMessage.removeListener(offscreenDocumentMessageListener);
    }
} //createOffscreenDocumentMessageListener()

// Create the main window when Chrome starts.
function handleStartup()
{
    console.log('TabFern: checking whether to open main window');

    ASQH.NowCC((cbk)=>{
        chrome.storage.local.get(SD.names.CFG_POPUP_ON_STARTUP, cbk);
    })
    .then((done, value) => {
        // If you call done() inside this callback, the main window
        // will be opened.

        if(value && !(SD.names.CFG_POPUP_ON_STARTUP in value)) {
            // We just updated to MV3.  Have the offscreen document
            // read the old popup-on-startup value for us.
            console.log('Triggering conversion from from MV2');
            chrome.runtime.onMessage.addListener(
                createOffscreenDocumentMessageListener(done)
            );
            setupOffscreenDocument(OFFSCREEN_DOC_URL);

        } else if(value && value[SD.names.CFG_POPUP_ON_STARTUP]) {
            done();
        }

        // Otherwise we never call done(), so the rest of the sequence
        // never runs.
    })
    .after(500)
    .val(()=>{
        console.log('Opening popup window');
        loadView();
    })
    ;
} //handleStartup


module.exports = {
    handleStartup,
}
