// app/bg/context-menu.js: service-worker code for context menu
// CC-BY-SA 3.0
//
// NOTE: Promises are not available until Chrome 95+, and I'm only requiring
// Chrome 88.  Therefore, use the callback style.


let ASQ = require('asynquence-contrib');
let ASQH = require('lib/asq-helpers');

const EDIT_NOTE_ID = 'editNote';    //context-menu item

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

function createContextMenuItem()
{
    ASQ()
    .try((done)=>{
        // Remove the menu item if it already existed
        chrome.contextMenus.remove(EDIT_NOTE_ID, ASQH.CC(done));
    })
    .val((result)=>{
        void result; // Ignore any errors
    })
    .then((done)=>{
        chrome.contextMenus.create(
            {
                id: EDIT_NOTE_ID,
                title: _T('menuAddEditNoteThisTab'),
                contexts: ['page'],
                visible: true
            },
            ASQH.CC(done)
        );
    })
    .then((done)=>{
        chrome.contextMenus.onClicked.addListener(editNoteOnClick, ASQH.CC(done));
    })
    .or((err)=>{
        // Just log --- nothing else we can do here
        console.warn(`Could not create context-menu item: ${err}`);
    })
    ;
} //createContextMenuItem

module.exports = createContextMenuItem;
