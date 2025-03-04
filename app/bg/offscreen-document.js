// app/bg/offscreen-document.js: service-worker code for the offscreen document
// CC-BY-SA 3.0
//
// NOTE: Promises are not available until Chrome 95+, and I'm only requiring
// Chrome 88.  Therefore, use the callback style.

if(false) { // Vendor files - listed here only so they'll be bundled
    require('vendor/common');
}

//let ASQ = require('asynquence-contrib');
let ASQH = require('lib/asq-helpers');

const OFFSCREEN_DOC_URL = chrome.runtime.getURL('mv3-converter/mv3-converter.html');

// Set up an offscreen document.  Modified from
// <https://developer.chrome.com/docs/extensions/reference/api/offscreen#maintain_the_lifecycle_of_an_offscreen_document>
function setupOffscreenDocument(offscreenUrl)
{
    // Check all windows controlled by the service worker to see if one
    // of them is the offscreen document with the given URL
    ASQH.NowCC((cbk)=>{
        chrome.runtime.getContexts(
            {
                contextTypes: ['OFFSCREEN_DOCUMENT'],
                documentUrls: [OFFSCREEN_DOC_URL]
            },
            cbk
        );
    })
    .then((done, existingContexts)=>{
        if (existingContexts.length == 0) {
            chrome.offscreen.createDocument(
                {
                    url: OFFSCREEN_DOC_URL,
                    reasons: [chrome.offscreen.Reason.LOCAL_STORAGE],
                    justification: 'Access localStorage user preferences related to extension lifecycle.',
                },
                ASQH.CC(done)
            );
        }
    })
    .or((err)=>{
        console.error(`Could not set up offscreen document: ${err}`);
    });
} //setupOffscreenDocument()


module.exports = setupOffscreenDocument;
