// app/bg/context-menu.js: service-worker code for context menu
// CC-BY-SA 3.0

let ASQ = require("asynquence-contrib");
let ASQH = require("lib/asq-helpers");

const EDIT_NOTE_ID = "editNote"; //context-menu item

function _handleEditNote(tab) {
    if (!tab.id) {
        return;
    }

    console.log(`Sending editNote for ${tab.id}`);
    chrome.runtime.sendMessage(
        { msg: MSG_EDIT_TAB_NOTE, tab_id: tab.id },
        // This callback is only for debugging --- all the action happens in
        // app/win/main_tl.js, the receiver.
        function (resp) {
            if (isLastError()) {
                console.log(
                    `Could not send edit-note to ${tab.id}:` +
                        lastBrowserErrorMessageString()
                );
            } else {
                console.log({ [`response to edit-note for ${tab.id}`]: resp });
            }
        }
    );
} // _handleEditNote()

function _contextMenuClicked(info, tab) {
    console.log({ contextMenuClicked: info, tab });

    switch (info.menuItemId) {
        case EDIT_NOTE_ID:
            _handleEditNote(tab);
            break;
        default:
            console.warn(`Unknown menu item ${info.menuItemId}`);
            break;
    }
} //_contextMenuClicked

// May be used as a chrome.runtime.onInstalled listener or not,
// so takes no args.
function setupContextMenu() {
    // Add this unconditionally per
    // <https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#register-listeners>
    chrome.contextMenus.onClicked.addListener(_contextMenuClicked);

    ASQ()
        .try((done) => {
            // Remove the menu item if it already existed
            chrome.contextMenus.remove(EDIT_NOTE_ID, ASQH.CC(done));
        })
        .then((done, result_or_err) => {
            void result_or_err; // Ignore any errors

            chrome.contextMenus.create(
                {
                    id: EDIT_NOTE_ID,
                    title: _T("menuAddEditNoteThisTab"),
                    contexts: ["page"],
                    visible: true,
                },
                ASQH.CC(done)
            );
        })
        .or((err) => {
            // Just log --- there's no way for us to recover.
            console.error(`Could not create context-menu item: ${err}`);

            // Do, however, unregister a listener that will never be used.
            chrome.contextMenus.onClicked.removeListener(_contextMenuClicked);
        });
} //setupContextMenu

module.exports = setupContextMenu;
