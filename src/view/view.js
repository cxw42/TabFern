//view.js

//////////////////////////////////////////////////////////////////////////
// Constants //

STORAGE_KEY='tabfern-data';

//////////////////////////////////////////////////////////////////////////
// Globals //

var treeobj;
var nodeid_by_winid = {};       // HACK
var my_winid;   //window ID of this popup window

//////////////////////////////////////////////////////////////////////////
// Node-state classes //

function tabState(newIsOpen, newTabValue)
{
    let retval = { nodeType: 'tab', isOpen: newIsOpen };
    if(newIsOpen) {
        retval.tab = newTabValue;
    } else {
        retval.url = newTabValue;
    }
    return retval;
} //tabState

function winState(newIsOpen, newWinValue)
{
    let retval = { nodeType: 'window', isOpen: newIsOpen };
    if(newIsOpen) {
        retval.win = newWinValue;
    } else {
        retval.win = undefined;
    }
    return retval;
} //winState

//////////////////////////////////////////////////////////////////////////
// jstree-action callbacks //

function actionRenameWindow(node_id, node, action_id, action_el)
{
    let win_name = window.prompt('Window name?', node.text);
    if(win_name === null) return;
    treeobj.rename_node(node_id, win_name);
    saveTree();
}

function actionCloseWindow(node_id, node, action_id, action_el)
{
    let thewin = node.data;
    if(typeof(thewin) === 'undefined') return;

    if(thewin.isOpen) {
        chrome.windows.remove(thewin.win.id);
    }
    node.data = winState(false);  // It appears this change does persist.
    treeobj.set_icon(node_id, true);    //default icon
} //actionCloseWindow

function actionDeleteWindow(node_id, node, action_id, action_el)
{
    actionCloseWindow(node_id, node, action_id, action_el);
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
        , icon: 'fff-page'
    };
    let tab_node_id = treeobj.create_node(parent_node_id, node_data);
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

function createNodeForWindow(win)
{
    // Don't put our window in the list
    if( (typeof(win.id) !== 'undefined') &&
        (win.id == my_winid) ) {
        return;
    }

    let win_node_id = treeobj.create_node(null,
            {     text: 'Window'
                , icon: 'visible-window-icon'
                , state: { 'opened': true }
                , data: winState(true, win)
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
                , state: { 'opened': true }
                , data: winState(false)
            });

    //nodeid_by_winid[win.id] = win_node_id;

    addWindowNodeActions(win_node_id);

    if(typeof(win_data.tabs) !== 'undefined') {
        for(let tab_data of win_data.tabs) {
            console.log('   ' + tab_data.text);
            createNodeForClosedTab(tab_data, win_node_id);
        }
    }

    return win_node_id;
} //createNodeForClosedWindow

//////////////////////////////////////////////////////////////////////////
// Loading //

function loadSavedWindowsIntoTree()
{
    chrome.storage.local.get(STORAGE_KEY, function(items) {
        if(typeof(chrome.runtime.lastError) !== 'undefined') return;
            // Ignore errors
        let parsed = items[STORAGE_KEY];    // auto JSON.parse
        if(!Array.isArray(parsed)) return;

        for(let win_data of parsed) {
            createNodeForClosedWindow(win_data);
        }
    });
} //loadSavedWindowsIntoTree

function addOpenWindowsToTree(winarr)
{
    let dat = {};

    for(let win of winarr) {
        //console.log('Window ' + win.id.toString());
        createNodeForWindow(win);
    } //foreach window
} //addOpenWindowsToTree(winarr)

//////////////////////////////////////////////////////////////////////////
// Saving //

function saveTree()
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

        let thiswin = {};       // what will hold our data

        thiswin.text = win_node.text;
        thiswin.tabs = [];

        // Stash the tabs.  No recursion at this time.
        if(typeof(win_node.children) !== 'undefined') {
            for(let tab_node of win_node.children) {
                let thistab = {};
                thistab.text = tab_node.text;
                thistab.url = tab_node.data.url;
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
                    console.log('TabFern: saved OK');
                    return;
                }
                console.log("TabFern: couldn't save: " +
                                chrome.runtime.lastError.toString());
                alert("TabFern: Couldn't save");
            });
} //saveTree()

//////////////////////////////////////////////////////////////////////////
// jstree callbacks //

function treeOnSelect(evt, data)
{
    //console.log(data.node);
    if(typeof(data.node) === 'undefined') return;

    // TODO handle clicking on Window rows

    let nodeState = data.node.data;
    let winid;
    if(typeof nodeState === 'undefined') return;

    if(nodeState.nodeType == 'tab' && nodeState.isOpen == false) {    // A closed tab
        // TODO open the window and put its id in winid and the tree node

    } else if(nodeState.nodeType == 'tab') {   // An open tab
        chrome.tabs.highlight({
            windowId: nodeState.tab.windowId,
            tabs: [nodeState.tab.index]
        });
        winid = nodeState.tab.windowId;

    } else if(nodeState.nodeType == 'window' && nodeState.isOpen == false) { //closed window
        // TODO open the window and put its id in winid and the tree node

    } else if(nodeState.nodeType == 'window') {    // An open window
        winid = nodeState.win.id

    } else {    // it's a nodeType we don't know how to handle.
        console.log('treeOnSelect: Unknown node ' + nodeState);
    }

    if(typeof winid !== 'undefined') {
        chrome.windows.update(winid, {'focused': true});
    }
} //treeOnSelect

//////////////////////////////////////////////////////////////////////////
// Chrome window/tab callbacks //

function winOnCreated(win)
{
    createNodeForWindow(win);
    saveTree();     // for now, brute-force save on any change.
} //winOnCreated

function winOnRemoved(win_id)
{
    let nodeid = nodeid_by_winid[win_id];
    if(typeof nodeid === 'undefined') return;
    treeobj.delete_node(nodeid);
    saveTree();
} //winOnRemoved

function tabOnCreated(tab)
{
    saveTree();
} //tabOnCreated

function tabOnUpdated(tabid, changeinfo, tab)
{
    saveTree();
}

function tabOnMoved(tabid, moveinfo)
{
    saveTree();
}

function tabOnActivated(activeinfo)
{
}

function tabOnHighlighted(highlightinfo)
{
}

function tabOnDetached(tabid, detachinfo)
{
    // Don't save here?  Do we get a WindowCreated if the tab is not
    // attached to another window?
}

function tabOnAttached(tabid, attachinfo)
{
    saveTree();
}

function tabOnRemoved(tabid, removeinfo)
{
    saveTree();
}

function tabOnReplaced(addedTabId, removedTabId)
{
    // Do we get this?
}

//////////////////////////////////////////////////////////////////////////
// Startup / shutdown //

function initTree(winid)
{ //called as a callback from sendMessage
    if(typeof(chrome.runtime.lastError) !== 'undefined') {
        console.log("Couldn't get win ID: " + chrome.runtime.lastError);
        return;
    }
    my_winid = winid;

    console.log('TabFern view.js initializing tree in window ' + winid.toString());

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
    loadSavedWindowsIntoTree();
    chrome.windows.getAll({'populate': true}, addOpenWindowsToTree);

    // Set event listeners
    $('#maintree').on('changed.jstree', treeOnSelect);

    chrome.windows.onCreated.addListener(winOnCreated);
    chrome.windows.onRemoved.addListener(winOnRemoved);
    // Not doing onFocusChanged for now

} //initTree()

function preInitTree()
{
    console.log('TabFern view.js initializing view');
    //console.log($('#maintree').toString());

    chrome.runtime.sendMessage(MSG_GET_VIEW_WIN_ID, initTree);

} //preInitTree


function shutdownTree()
{ // this is called.  TODO? clear a "crashed" flag?
    // From https://stackoverflow.com/a/3840852/2877364
    // by https://stackoverflow.com/users/449477/pauan
    let background = chrome.extension.getBackgroundPage();
    background.console.log('popup closing');
} //shutdownTree()

//////////////////////////////////////////////////////////////////////////
// MAIN //

window.addEventListener('load', preInitTree, { 'once': true });
window.addEventListener('unload', shutdownTree, { 'once': true });
//TODO test what happens when Chrome exits.  Does this background need to
//save anything?

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
