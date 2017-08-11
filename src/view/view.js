//view.js

//////////////////////////////////////////////////////////////////////////
// Constants //

STORAGE_KEY='tabfern-data';
WIN_CLASS='tabfern-window';     // class on <li>s representing windows
FOCUSED_WIN_CLASS='tf-focused-window';

//////////////////////////////////////////////////////////////////////////
// Globals //

var treeobj;
var nodeid_by_winid = {};       // Window ID (integer) to tree-node id (string)
var nodeid_by_tabid = {};       // Tab ID (int) to tree-node id (string)
var my_winid;   //window ID of this popup window

var window_is_being_restored = false;
    // HACK to avoid creating extra tree items.

//////////////////////////////////////////////////////////////////////////
// Node-state classes //

// These classes only hold the info that's not elsewhere in the jstree.
// For example, parent/child relationships and tab titles are in the tree,
// so are not here.

function tabState(newIsOpen, newTabValue)
{
    let retval = { nodeType: 'tab', isOpen: newIsOpen };
    if(newIsOpen) {
        retval.tab = newTabValue;
        retval.url = newTabValue.url;
    } else {
        retval.url = newTabValue;
    }
    return retval;
} //tabState

function winState(newIsOpen, newWasSaved, newWinValue)
{
    let retval = {
        nodeType: 'window'
        , isOpen: newIsOpen
        , wasSaved: newWasSaved     // whether this window was previously
    };                              // saved by the user (by closing it
                                    // without deleting it).
    if(newIsOpen) {
        retval.win = newWinValue;
    } else {
        retval.win = undefined;
    }
    return retval;
} //winState

//////////////////////////////////////////////////////////////////////////
// Saving //

function saveTree(save_visible_windows = true)
{
    // Get the raw data for the whole tree
    let win_nodes = treeobj.get_json();

    let data = [];      // our data

    // Clean up the data
    for(let win_node of win_nodes) {

        // Don't save windows with no children
        if( (typeof(win_node.children) === 'undefined') ||
            (win_node.children.length === 0) ) {
            continue;
        }

        // Don't save visible windows unless we've been asked to.
        // However, always save windows marked as wasSaved.
        if( (!save_visible_windows) && win_node.data.isOpen &&
            (!win_node.data.wasSaved)) {
            continue;
        }

        let thiswin = {};       // what will hold our data

        thiswin.text = win_node.text;
        thiswin.tabs = [];

        // Stash the tabs.  No recursion at this time.
        if(typeof(win_node.children) !== 'undefined') {
            for(let tab_node of win_node.children) {
                let thistab = {};
                thistab.text = tab_node.text;
                thistab.url = tab_node.data.url;
                // TODO save favIconUrl?
                thiswin.tabs.push(thistab);
            }
        }

        data.push(thiswin);
    } //foreach window

    // Save it
    let to_save = {};
    to_save[STORAGE_KEY] = data;    // storage automatically does JSON.stringify
    chrome.storage.local.set(to_save,
            function() {
                if(typeof(chrome.runtime.lastError) === 'undefined') {
                    //console.log('TabFern: saved OK');
                    return;
                }
                console.log("TabFern: couldn't save: " +
                                chrome.runtime.lastError.toString());
                alert("TabFern: Couldn't save");
            });
} //saveTree()

//////////////////////////////////////////////////////////////////////////
// jstree-action callbacks //

function actionRenameWindow(node_id, node, unused_action_id, unused_action_el)
{
    let win_name = window.prompt('Window name?', node.text);
    if(win_name === null) return;
    treeobj.rename_node(node_id, win_name);
    saveTree();
}

function actionCloseWindow(node_id, node, unused_action_id, unused_action_el)
{
    let win_data = node.data;
    if(typeof(win_data) === 'undefined') return;
    if(typeof(win_data.win) === 'undefined') return;
        // don't try to close an already-closed window.

    nodeid_by_winid[win_data.win.id] = undefined;
        // Prevents winOnRemoved() from removing the tree node

    if(win_data.isOpen) {
        chrome.windows.remove(win_data.win.id);
    }
    node.data = winState(false, true);
        // true => the user chose to save this window
        // It appears this change does persist.
        // This leaves node.data.win undefined.
    treeobj.set_icon(node_id, true);    //default icon
} //actionCloseWindow

function actionDeleteWindow(node_id, node, unused_action_id, unused_action_el)
{
    actionCloseWindow(node_id, node, unused_action_id, unused_action_el);
    treeobj.delete_node(node_id);
    saveTree();
} //actionDeleteWindow

//////////////////////////////////////////////////////////////////////////
// Tree-node creation //

function createNodeForTab(tab, parent_node_id)
{
    let node_data = {
          text: tab.title
        //, 'my_crazy_field': tab.id    // <-- is thrown out
        //, 'attr': 'some_attr'         // <-- also thrown out
        , data: tabState(true, tab)   // but this stays!
        , icon: tab.favIconUrl || 'fff-page'
    };
    let tab_node_id = treeobj.create_node(parent_node_id, node_data);
    nodeid_by_tabid[tab.id] = tab_node_id;
    return tab_node_id;
} //createNodeForTab

function createNodeForClosedTab(tab_data, parent_node_id)
{
    let node_data = {
          text: tab_data.text
        , data: tabState(false, tab_data.url)
        , icon: 'fff-page'
    };
    let tab_node_id = treeobj.create_node(parent_node_id, node_data);
    //nodeid_by_tabid[tab.id] = tab_node_id;    // can't --- it's closed
    return tab_node_id;
} //createNodeForClosedTab

function addWindowNodeActions(win_node_id)
{
    // Add them R to L for now - TODO update if necessary when CSS changes

    treeobj.add_action(win_node_id, {
        id: 'deleteWindow',
        class: 'fff-cross action-margin right-top',
        text: '&nbsp;',
        after: true,      // after the text, which is in an <a>
        selector: 'a',
        callback: actionDeleteWindow
    });

    treeobj.add_action(win_node_id, {
        id: 'closeWindow',
        class: 'fff-picture-delete action-margin right-top',
        text: '&nbsp;',
        after: true,      // after the text, which is in an <a>
        selector: 'a',
        callback: actionCloseWindow
    });

    treeobj.add_action(win_node_id, {
        id: 'renameWindow',
        class: 'fff-pencil action-margin right-top',
        text: '&nbsp;',
        after: true,      // after the text, which is in an <a>
        selector: 'a',
        callback: actionRenameWindow
    });

} //addWindowNodeActions

function createNodeForWindow(win, wasSaved)
{
    // Don't put our window in the list
    if( (typeof(win.id) !== 'undefined') &&
        (win.id == my_winid) ) {
        return;
    }

    let win_node_id = treeobj.create_node(null,
            {     text: 'Window'
                , icon: (wasSaved ? 'visible-saved-window-icon' :
                                    'visible-window-icon')
                , li_attr: { class: WIN_CLASS }
                , state: { 'opened': true }
                , data: winState(true, wasSaved, win)
            });

    nodeid_by_winid[win.id] = win_node_id;

    addWindowNodeActions(win_node_id);

    if(typeof(win.tabs) !== 'undefined') {  // new windows may have no tabs
        for(let tab of win.tabs) {
            console.log('   ' + tab.id.toString() + ': ' + tab.title);
            createNodeForTab(tab, win_node_id);
        }
    }

    return win_node_id;
} //createNodeForWindow

function createNodeForClosedWindow(win_data)
{
    let win_node_id = treeobj.create_node(null,
            {   text: win_data.text
                //, 'icon': 'visible-window-icon'   // use the default icon
                , li_attr: { class: WIN_CLASS }
                , state: { 'opened': true }
                , data: winState(false, true)   // true => was saved
            });

    //nodeid_by_winid[win.id] = win_node_id;

    addWindowNodeActions(win_node_id);

    if(typeof(win_data.tabs) !== 'undefined') {
        for(let tab_data of win_data.tabs) {
            //console.log('   ' + tab_data.text);
            createNodeForClosedTab(tab_data, win_node_id);
        }
    }

    return win_node_id;
} //createNodeForClosedWindow

//////////////////////////////////////////////////////////////////////////
// Loading //

function loadSavedWindowsIntoTree(next_action)
{
    chrome.storage.local.get(STORAGE_KEY, function(items) {
        if(typeof(chrome.runtime.lastError) !== 'undefined') return;
            // Ignore errors
        let parsed = items[STORAGE_KEY];    // auto JSON.parse
        if(!Array.isArray(parsed)) return;

        //console.log('Loading:');
        //console.log(parsed);

        for(let win_data of parsed) {
            createNodeForClosedWindow(win_data);
        }
        if(typeof next_action !== 'function') return;
        next_action();
    });
} //loadSavedWindowsIntoTree

// Debug helper
function DBG_printSaveData()
{
    chrome.storage.local.get(STORAGE_KEY, function(items) {
        if(typeof(chrome.runtime.lastError) !== 'undefined') return;
            // Ignore errors
        let parsed = items[STORAGE_KEY];
        console.log('Save data:');
        console.log(parsed);
    });
}

//////////////////////////////////////////////////////////////////////////
// jstree callbacks //

function treeOnSelect(evt, evt_data)
{
    //console.log(evt_data.node);
    if(typeof(evt_data.node) === 'undefined') return;

    let node = evt_data.node;
    let node_data = node.data;
    let win_id;     // If assigned, this window will be brought to the front
                    // at the end of this function.
    if(typeof node_data === 'undefined') return;

    // TODO figure out why this doesn't work: treeobj.deselect_node(node, true);
    treeobj.deselect_all(true);
        // Clear the selection.  True => no event due to this change.

    if(node_data.nodeType == 'tab' && node_data.isOpen == false) {    // A closed tab
        // TODO open the window and put its id in win_id and the tree node
        console.log('TODO open tab');

    } else if(node_data.nodeType == 'tab') {   // An open tab
        chrome.tabs.highlight({
            windowId: node_data.tab.windowId,
            tabs: [node_data.tab.index]
        });
        win_id = node_data.tab.windowId;

    } else if(node_data.nodeType == 'window' && node_data.isOpen == false) { //closed window
        // TODO open the window and put its id in win_id and the tree node
        console.log('TODO open window');

        // Grab the URLs for all the tabs
        let urls=[];
        for(let child_id of node.children) {
            let child_data = treeobj.get_node(child_id).data;
            urls.push(child_data.url);
        }

        // Open the window
        window_is_being_restored = true;
        chrome.windows.create(
            {
                url: urls,
                focused: true
            },
            function(win) {
                // Update the tree and node mappings
                node_data.isOpen = true;
                node_data.win = win;
                treeobj.set_icon(node.id, 'visible-saved-window-icon');

                nodeid_by_winid[win.id] = node.id;

                for(let idx=0; idx < win.tabs.length; ++idx) {
                    let tab_node_id = node.children[idx];
                    let tab_data = treeobj.get_node(tab_node_id).data;
                    tab_data.isOpen = true;
                    tab_data.tab = win.tabs[idx];

                    nodeid_by_tabid[tab_data.tab.id] = tab_node_id;
                }
            } //create callback
        );

    } else if(node_data.nodeType == 'window') {    // An open window
        win_id = node_data.win.id

    } else {    // it's a nodeType we don't know how to handle.
        console.log('treeOnSelect: Unknown node ' + node_data);
    }

    if(typeof win_id !== 'undefined') {
        // Activate the window, if it still exists.
        chrome.windows.get(win_id, function(win) {
            if(typeof(chrome.runtime.lastError) !== 'undefined') return;
            chrome.windows.update(win_id, {focused: true});
        });
    }
} //treeOnSelect

//////////////////////////////////////////////////////////////////////////
// Chrome window/tab callbacks //

function winOnCreated(win)
{
    if(window_is_being_restored) {
        window_is_being_restored = false;
        return;     // don't create an extra copy
    }

    createNodeForWindow(win, false);
        // TODO figure out how to handle this when re-opening closed windows
    saveTree();     // for now, brute-force save on any change.
} //winOnCreated

function winOnRemoved(win_id)
{
    let node_id = nodeid_by_winid[win_id];
    if(typeof node_id === 'undefined') return;
    let node = treeobj.get_node(node_id);
    if(typeof node === 'undefined') return;

    winOnFocusChanged(chrome.windows.WINDOW_ID_NONE);
        // Clear the highlights.  TODO test this.

    if(node.data.wasSaved) {
        node.data.isOpen = false;   // because it's already gone
        actionCloseWindow(node_id, node, null, null);
            // Since it was saved, leave it saved.  You can only get rid
            // of saved sessions by X-ing them expressly (actionDeleteWindow).
    } else {
        // Not saved - just toss it.
        treeobj.delete_node(node);
            // This removes the node's children also.
    }

    saveTree();     // TODO figure out if we need this.
} //winOnRemoved

function winOnFocusChanged(win_id)
{
    // Clear the focus highlights
    $('.' + WIN_CLASS + ' > a').removeClass(FOCUSED_WIN_CLASS);

    if(win_id == chrome.windows.WINDOW_ID_NONE) return;

    // Get the window
    let window_node_id = nodeid_by_winid[win_id];
    if(typeof window_node_id === 'undefined') return;
        // E.g., if win_id corresponds to this view.

    // Make the window's entry bold, but no other entries.
    $('#' + window_node_id + ' > a').addClass(FOCUSED_WIN_CLASS);
} //winOnFocusChanged

function tabOnCreated(tab)
{
    let win_node_id = nodeid_by_winid[tab.windowId];
    if(typeof win_node_id === 'undefined') return;

    let tab_node_id = createNodeForTab(tab, win_node_id);
        // Adds at end
    treeobj.move_node(tab_node_id, win_node_id, tab.index);
        // Put it in the right place

    saveTree();
} //tabOnCreated

function tabOnUpdated(tabid, changeinfo, tab)
{
    let tab_node_id = nodeid_by_tabid[tabid];
    if(typeof tab_node_id === 'undefined') return;

    let node = treeobj.get_node(tab_node_id);
    let node_data = node.data;
        // Changes to this do appear to stick
    node_data.isOpen = true;     //lest there be any doubt
    node_data.url = changeinfo.url || tab.url || 'about:blank';

    treeobj.rename_node(tab_node_id, changeinfo.title || tab.title || 'Tab');
    treeobj.set_icon(tab_node_id,
            changeinfo.favIconUrl || tab.favIconUrl || 'fff-page');

    saveTree();
} //tabOnUpdated

function tabOnMoved(tabid, moveinfo)
{
    let from_idx = moveinfo.fromIndex;
    let to_idx = moveinfo.toIndex;

    // Get the parent (window)
    let parent_node_id = nodeid_by_winid[moveinfo.windowId];
    if(typeof parent_node_id === 'undefined') return;

    // Get the tab's node
    let tab_node_id = nodeid_by_tabid[tabid];
    if(typeof tab_node_id === 'undefined') return;

    // Get the existing tab's node so we can swap them
    chrome.tabs.query(
        {
            windowId: moveinfo.windowId
            , index: from_idx
        },
        function(tabs) {
            // Get the two tabs in question
            let other_tab = tabs[0];
            if(typeof other_tab.id === 'undefined') return;
            let other_tab_node_id = nodeid_by_tabid[other_tab.id];
            if(typeof other_tab_node_id === 'undefined') return;
            let other_tab_node = treeobj.get_node(other_tab_node_id);
            if(typeof other_tab_node === 'undefined') return;

            let tab_node = treeobj.get_node(tab_node_id);
            if(typeof tab_node === 'undefined') return;

            // Move the tree node
            console.log('Moving tab from ' + from_idx.toString() + ' to ' +
                        to_idx.toString());

            // As far as I can tell, in jstree, indices point between list
            // elements.  E.g., with n items, #0 is before the first and
            // #n is after the last.  However, Chrome tab indices point to
            // the tabs themselves, #0.. #(n-1).  Therefore, if we are moving
            // right, bump the index by 1 so we will be _after_ that item
            // rather than _before_ it.
            // See the handling of `pos` values of "before" and "after"
            // in the definition of move_node() in jstree.js.
            let jstree_new_index =
                    to_idx+(to_idx>from_idx ? 1 : 0);

            treeobj.move_node(tab_node_id, parent_node_id, jstree_new_index);

            // Update the indices so the nodes know where they are now
            tab_node.data.tab.index = to_idx;
            other_tab_node.data.tab.index = from_idx;

            saveTree();
        } //inner function to do the move
    );
} //tabOnMoved

function tabOnActivated(activeinfo)
{
    winOnFocusChanged(activeinfo.windowId);

    // Use this if you want the selection to track the open tab.
    if(false) {
        // Get the tab's node
        let tab_node_id = nodeid_by_tabid[activeinfo.tabId];
        if(typeof tab_node_id === 'undefined') return;

        treeobj.deselect_all();
        treeobj.select_node(tab_node_id);
    }

    //let parent_node = treeobj.get_node(parent_node_id);
    //if(typeof parent_node === 'undefined') return;

    // No need to save --- we don't save which tab is active.
} //tabOnActivated

function tabOnHighlighted(highlightinfo)
{
    // Ignore this, I think.
} //tabOnHighlighted

function tabOnDetached(tabid, detachinfo)
{
    // Don't save here?  Do we get a WindowCreated if the tab is not
    // attached to another window?
} //tabOnDetached

function tabOnAttached(tabid, attachinfo)
{
    //TODO
    //saveTree();
} //tabOnAttached

function tabOnRemoved(tabid, removeinfo)
{
    // If the window is closing, do not remove the tab records.
    // The cleanup will be handled by winOnRemoved().
    if(removeinfo.isWindowClosing) return;

    // Get the parent (window)
    let parent_node_id = nodeid_by_winid[removeinfo.windowId];
    if(typeof parent_node_id === 'undefined') return;
    let parent_node = treeobj.get_node(parent_node_id);
    if(typeof parent_node === 'undefined') return;

    // Get the tab's node
    let tab_node_id = nodeid_by_tabid[tabid];
    if(typeof tab_node_id === 'undefined') return;
    let tab_node = treeobj.get_node(tab_node_id);
    if(typeof tab_node === 'undefined') return;

    // Remove the node
    nodeid_by_tabid[tabid] = undefined;
        // So any events that are triggered won't try to look for a
        // nonexistent tab.
    treeobj.delete_node(tab_node);

    saveTree();
} //tabOnRemoved

function tabOnReplaced(addedTabId, removedTabId)
{
    // Do we get this?
} //tabOnReplaced

//////////////////////////////////////////////////////////////////////////
// Startup / shutdown //

// This is done in continuation-passing style.  TODO make it cleaner.

function initTree3()
{
    // Set event listeners
    $('#maintree').on('changed.jstree', treeOnSelect);

    chrome.windows.onCreated.addListener(winOnCreated);
    chrome.windows.onRemoved.addListener(winOnRemoved);
    chrome.windows.onFocusChanged.addListener(winOnFocusChanged);

    chrome.tabs.onCreated.addListener(tabOnCreated);
    chrome.tabs.onUpdated.addListener(tabOnUpdated);
    chrome.tabs.onMoved.addListener(tabOnMoved);
    chrome.tabs.onRemoved.addListener(tabOnRemoved);

    chrome.tabs.onActivated.addListener(tabOnActivated);

} //initTree3

function addOpenWindowsToTree(winarr)
{
    let dat = {};
    let focused_win_id;

    for(let win of winarr) {
        //console.log('Window ' + win.id.toString());
        if(win.focused) {
            focused_win_id = win.id;
        }
        createNodeForWindow(win, false);
    } //foreach window

    // Highlight the focused window.
    // However, generally the popup will be focused when this runs,
    // and we're not showing the popup.
    if(typeof focused_win_id !== 'undefined') {
        winOnFocusChanged(focused_win_id);
    }

    initTree3();
} //addOpenWindowsToTree(winarr)

function initTree2()
{
    chrome.windows.getAll({'populate': true}, addOpenWindowsToTree);
} //initTree2()

function initTree1(win_id)
{ //called as a callback from sendMessage
    if(typeof(chrome.runtime.lastError) !== 'undefined') {
        console.log("Couldn't get win ID: " + chrome.runtime.lastError);
        return;
    }
    my_winid = win_id;

    console.log('TabFern view.js initializing tree in window ' + win_id.toString());

    // Create the tree
    $('#maintree').jstree({
          'plugins': ['actions', 'wholerow']
        , 'core': {
            'animation': false,
            'multiple': false,          // for now
            'check_callback': true,     // for now, allow modifications
            themes: {
                'name': 'default-dark'
                , 'variant': 'small'
            }
        }
        , 'state': {
            'key': 'tabfern-jstree'
        }
    });
    treeobj = $('#maintree').jstree(true);

    // Load the tree
    loadSavedWindowsIntoTree(initTree2);
} //initTree1()

function initTree0()
{
    console.log('TabFern view.js initializing view');
    //console.log($('#maintree').toString());

    chrome.runtime.sendMessage(MSG_GET_VIEW_WIN_ID, initTree1);

} //initTree0


function shutdownTree()
{ // this is called.  TODO? clear a "crashed" flag?
    // From https://stackoverflow.com/a/3840852/2877364
    // by https://stackoverflow.com/users/449477/pauan
    let background = chrome.extension.getBackgroundPage();
    background.console.log('popup closing');
    saveTree(false);    // false => don't save visible, non-saved windows
} //shutdownTree()

//////////////////////////////////////////////////////////////////////////
// MAIN //

window.addEventListener('load', initTree0, { 'once': true });
window.addEventListener('unload', shutdownTree, { 'once': true });
//TODO test what happens when Chrome exits.  Does this background need to
//save anything?

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
