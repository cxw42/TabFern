// app/bg/open-main-window.js: service-worker code to open the main window
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

// Actually open the view, i.e., the main TF window
let loadView = function loadView()
{
    ASQH.NowCC((cbk) => {
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
            cbk
        );
    })
    .then((done, win) => {
        let winId = win.id;
        console.log('TabFern new View ID: ' + winId.toString());
        chrome.storage.session.set({[SD.names.VIEW_WIN_ID_KEY]: winId}, ()=>{
            if(isLastError()) {
                done.fail(chrome.runtime.lastError);
            } else {
                done(winId);
            }
        });
    })
    .val((winId)=> {
        chrome.windows.update(winId, {focused:true}, ignore_chrome_error);
    });
} //loadView()

// Set up an offscreen document.  Modified from
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

// Remove the stored view window ID when that window is closed.
function handleWindowRemoved(windowId)
{
    ASQH.NowCC((cbk)=>{
        chrome.storage.session.get(SD.names.VIEW_WIN_ID_KEY, cbk);
    })
    .then((done, result)=>{
        // If the window getting closed is the popup we created
        if (windowId === result[SD.names.VIEW_WIN_ID_KEY]) {
            // Record that the window is now closed
            console.log('Popup window was closed');
            chrome.storage.session.remove(SD.names.VIEW_WIN_ID_KEY, ASQH.CC(done));
        }
    })
    ;
} //handleWindowRemoved()

// Create the main window when Chrome starts.
function handleStartup()
{
    console.log('TabFern: checking whether to open main window');

    chrome.windows.onRemoved.addListener(handleWindowRemoved);

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
            setupOffscreenDocument('mv3-converter/mv3-converter.html');

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
