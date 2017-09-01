// view.js
// Uses jquery, jstree, jstree-actions, loglevel, common.js, all of which are
// loaded by view.html.

//////////////////////////////////////////////////////////////////////////
// Constants //

const STORAGE_KEY='tabfern-data';
    // Store the saved windows/tabs
const LOCN_KEY='tabfern-window-location';
    // Store where the tabfern popup is

const WIN_CLASS='tabfern-window';     // class on all <li>s representing windows
const FOCUSED_WIN_CLASS='tf-focused-window';  // Class on the currently-focused win
const VISIBLE_WIN_CLASS='tf-visible-window';  // Class on all visible wins
const ACTION_GROUP_WIN_CLASS='tf-action-group';   // Class on action-group div

const INIT_TIME_ALLOWED_MS = 2000;  // After this time, if init isn't done,
                                    // display an error message.
const INIT_MSG_SEL = 'div#init-incomplete';     // Selector for that message

// Syntactic sugar
const WIN_KEEP = true;
const WIN_NOKEEP = false;

//////////////////////////////////////////////////////////////////////////
// Globals //

let treeobj;                    ///< The jstree instance
let mdTabs;                     ///< Map between open-tab IDs and node IDs
let mdWindows;                  ///< Map between open-window IDs and node IDs
let my_winid;                   ///< window ID of this popup window

/// Window ID of the currently-focused window, as best we understand it.
let currently_focused_winid = null;

/// HACK to avoid creating extra tree items.
let window_is_being_restored = false;

/// ID of a timer to save the new window size after a resize event
let resize_save_timer_id;

/// Did initialization complete successfully?
let did_init_complete = false;

/// The size of the last-closed window, to be used as the
/// size of newly-opened windows (whence the name).
/// Should always have a valid value.
let newWinSize = {left: 0, top: 0, width: 300, height: 600};

/// The sizes of the currently-open windows, for use in setting #newWinSize.
/// The size of this popup, and other non-normal windows, is not tracked here.
let winSizes={};

// TODO use content scripts to catch window resizing, a la
// https://stackoverflow.com/q/13141072/2877364

/// The keyboard shortcuts handler, if any.
let Shortcuts;

/// The hamburger menu
let Hamburger;

//////////////////////////////////////////////////////////////////////////
// Initialization //

// NOTE: as of writing, log.debug() is a no-op - see
// https://github.com/pimterry/loglevel/issues/111
log.setDefaultLevel(log.levels.INFO);
    // TODO change the default to ERROR or SILENT for production.

// TODO move more of the tab data out of tree_node.data and into the multidex.
mdTabs = Multidex(
    [ //keys
        'tab_id'    // from Chrome
      , 'node_id'   // from jstree
    ],
    [ //other data
        'win_id'    // from Chrome
      , 'index'     // in the current window
      , 'tab'       // the actual Tab record from Chrome
    ]);

mdWindows = Multidex(
    [ //keys
        'win_id'    // from Chrome
      , 'node_id'   // from jstree
    ],
    [ //other data
        'win'       // the actual Window record from chrome
        // TODO a list of tabs?
    ]);

//////////////////////////////////////////////////////////////////////////
// General utility routines //

/// Ignore a Chrome callback error, and suppress Chrome's "runtime.lastError"
/// diagnostic.
function ignore_chrome_error() { void chrome.runtime.lastError; }

/// Given string #class_list, add #new_class without duplicating.
function add_classname(class_list, new_class)
{
    let attrs = class_list.split(/\s+/);
    if(attrs.indexOf(new_class) === -1) {
        attrs.push(new_class);
    }
    return attrs.join(' ');
} //add_classname()

/// Given string #class_list, remove #existing_class if it is present.
/// Will remove duplicates.
function remove_classname(class_list, existing_class)
{
    let attrs = class_list.split(/\s+/);
    let idx = attrs.indexOf(existing_class);
    while(idx !== -1) {
        attrs.splice(idx, 1);
        idx = attrs.indexOf(existing_class);
    }
    return attrs.join(' ');
} //remove_classname()

/// Set or remove the VISIBLE_WIN_CLASS style on an existing node.
/// TODO figure out a cleaner way to do this - it's not obvious to me from
/// the jstree docs how to change li_attr after node creation.
function twiddleVisibleStyle(node, shouldAdd)
{
    let class_str;
    let isobj = true;
    if(typeof(node.li_attr) === 'object') {
                // On existing nodes, li_attr is an object.
        class_str = node.li_attr.class;
    } else if(typeof(node.li_attr) === 'string') {
        isobj = false;
        class_str = node.li_attr;
    } else {        // we don't know how to handle it.
        return;
    }

    if(shouldAdd) {
        class_str = add_classname(class_str, VISIBLE_WIN_CLASS);
    } else {
        class_str = remove_classname(class_str, VISIBLE_WIN_CLASS);
    }

    if(isobj) {
        node.li_attr.class = class_str;
    } else {
        node.li_attr = class_str;
    }

    //treeobj.redraw(); // this doesn't seem to work

    if(shouldAdd) {
        $('#'+node.id).addClass(VISIBLE_WIN_CLASS);
    } else {
        $('#'+node.id).removeClass(VISIBLE_WIN_CLASS);
    }
}

/// Set the tab.index values of the tab nodes in a window.  Assumes that
/// the nodes are in the proper order in the tree.
/// \pre    #win_node_id is the id of a node that both exists and represents
///         a window.
function updateTabIndexValues(win_node_id)
{
    // NOTE: later, when adding nested trees, see
    // https://stackoverflow.com/a/10823248/2877364 by
    // https://stackoverflow.com/users/106224/boltclock

    $('#'+win_node_id).find('li.jstree-leaf').each(
        function(idx, dom_node) {
            let tree_node = treeobj.get_node(dom_node);
            if(tree_node !== false)
                tree_node.data.tab.index = idx;
        }
    );
} //updateTabIndexValues

/// Get the size of a window, as an object
function getWindowSize(win)
{
    // || is to provide some sensible defaults - thanks to
    // https://stackoverflow.com/a/7540412/2877364 by
    // https://stackoverflow.com/users/113716/user113716

    // Are these the right fields of #win to use?  They seem to work.

    return {
          'left': win.screenLeft || 0
        , 'top': win.screenTop || 0
        , 'width': win.outerWidth || 300
        , 'height': win.outerHeight || 600
    };
} //getWindowSize

/// Get the size of a window, as an object, from a Chrome window record.
/// See comments in getWindowSize().
function getWindowSizeFromWindowRecord(win)
{
    return {
          'left': win.left || 0
        , 'top': win.top || 0
        , 'width': win.width || 300
        , 'height': win.height || 600
    };
} //getWindowSize

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

function winState(newIsOpen, newKeep, newWinValue)
{
    let retval = {
        nodeType: 'window'
        , isOpen: newIsOpen
        , keep: newKeep
            // whether this window is to be saved for a later session.
    };

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
        // However, always save windows marked as keep.
        if( (!save_visible_windows) && win_node.data.isOpen &&
            (!win_node.data.keep)) {
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
                    return;     // Saved OK
                }
                let msg = "TabFern: couldn't save: " +
                                chrome.runtime.lastError.toString();
                log.error(msg);
                alert(msg);     // The user needs to know
            });
} //saveTree()

//////////////////////////////////////////////////////////////////////////
// jstree-action callbacks //

function actionRenameWindow(node_id, node, unused_action_id, unused_action_el)
{
    let win_name = window.prompt('Window name?', node.text);
    if(win_name === null) return;
    treeobj.rename_node(node_id, win_name);
    node.data.keep = true;  // assume that a user who bothered to rename a node
                            // wants to keep it.

    if(node.data.isOpen) {
        treeobj.set_icon(node, 'visible-saved-window-icon');
    }

    saveTree();
}

/// Close a window, but don't delete its tree nodes.  Used for saving windows.
/// ** The caller must call saveTree() --- actionCloseWindow() does not.
function actionCloseWindow(node_id, node, unused_action_id, unused_action_el)
{
    let win_data = node.data;
    if(typeof(win_data) === 'undefined') return;
    if(typeof(win_data.win) === 'undefined') return;
        // don't try to close an already-closed window.

    log.info('Removing nodeid map for winid ' + win_data.win.id);
    let win_val = mdWindows.by_win_id(win_data.win.id);
    mdWindows.remove_value(win_val);
        // Prevents winOnRemoved() from removing the tree node

    // Close the window
    if(win_data.isOpen) {
        chrome.windows.remove(win_data.win.id, ignore_chrome_error);
        // ignore exceptions - when we are called from winOnRemoved,
        // the window is already gone, so the remove() throws.
        // See https://stackoverflow.com/a/45871870/2877364 by cxw
    }

    // Mark the tree node closed
    node.data = winState(false, WIN_KEEP);
        // true => the user chose to save this window
        // It appears this change does persist.
        // This leaves node.data.win undefined.
    treeobj.set_icon(node_id, true);    //default icon
    twiddleVisibleStyle(node, false);   // remove the visible style

    // Collapse the tree, if the user wants that
    if(getBoolSetting("collapse-tree-on-window-close")) {
        treeobj.close_node(node);
    }

    // Mark the tabs in the tree node closed.
    for(let child_node_id of node.children) {
        let child_node = treeobj.get_node(child_node_id);
        if(typeof child_node === undefined) continue;
        child_node.data.isOpen = false;
        child_node.data.tab = undefined;
        // The url sticks around.

        let child_node_val = mdTabs.by_node_id(child_node_id);
        mdTabs.remove_value(child_node_val);
    }
} //actionCloseWindow

function actionDeleteWindow(node_id, node, unused_action_id, unused_action_el)
{
    actionCloseWindow(node_id, node, unused_action_id, unused_action_el);
    let scrollOffsets = [window.scrollX, window.scrollY];
    treeobj.delete_node(node_id);
    window.scrollTo(...scrollOffsets);
    saveTree();
} //actionDeleteWindow

//////////////////////////////////////////////////////////////////////////
// Tree-node creation //

function createNodeForTab(tab, parent_node_id)
{
    { //  debug
        let tab_val = mdTabs.by_tab_id(tab.id);
        if(tab_val !== undefined) {
            console.log('About to create node for existing tab ' + tab.id);
        }
    } // /debug

    let node_data = {
          text: tab.title
        //, 'my_crazy_field': tab.id    // <-- is thrown out
        //, 'attr': 'some_attr'         // <-- also thrown out
        , data: tabState(true, tab)   // but this stays!
        , icon: tab.favIconUrl || 'fff-page'
    };
    // TODO if the favicon doesn't load, replace the icon with the generic
    // page icon so we don't keep hitting the favIconUrl.
    let tab_node_id = treeobj.create_node(parent_node_id, node_data);
    mdTabs.add({tab_id: tab.id, node_id: tab_node_id, tab: tab});
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
    // Not stored in mdTabs since it isn't open.
    return tab_node_id;
} //createNodeForClosedTab

function addWindowNodeActions(win_node_id)
{
    treeobj.make_group(win_node_id, {
        selector: 'a',
        after: true,
        class: ACTION_GROUP_WIN_CLASS
    });

    treeobj.add_action(win_node_id, {
        id: 'renameWindow',
        class: 'fff-pencil action-margin right-top',
        text: '&nbsp;',
        grouped: true,
        //after: true,      // after the text, which is in an <a>
        //selector: 'a',
        callback: actionRenameWindow
    });

    treeobj.add_action(win_node_id, {
        id: 'closeWindow',
        class: 'fff-picture-delete action-margin right-top',
        text: '&nbsp;',
        grouped: true,
        //after: true,      // after the text, which is in an <a>
        //selector: 'a',
        callback: actionCloseWindow
    });

    treeobj.add_action(win_node_id, {
        id: 'deleteWindow',
        class: 'fff-cross action-margin right-top',
        text: '&nbsp;',
        grouped: true,
        //after: true,      // after the text, which is in an <a>
        //selector: 'a',
        callback: actionDeleteWindow
    });

} //addWindowNodeActions

/// Create a tree node for open window #win.
/// @returns the tree-node ID, or undefined on error.
function createNodeForWindow(win, keep)
{
    // Don't put this popup window (view.html) in the list
    if( (typeof(win.id) !== 'undefined') &&
        (win.id == my_winid) ) {
        return;
    }

    let win_node_id = treeobj.create_node(null,
            {     text: 'Window'
                , icon: (keep ? 'visible-saved-window-icon' :
                                    'visible-window-icon')
                , li_attr: { class: WIN_CLASS + ' ' + VISIBLE_WIN_CLASS }
                , state: { 'opened': true }
                , data: winState(true, keep, win)
            });

    log.info('Adding nodeid map for winid ' + win.id);
    mdWindows.add({ win_id: win.id, node_id: win_node_id, win:win });

    addWindowNodeActions(win_node_id);

    if(typeof(win.tabs) !== 'undefined') {  // new windows may have no tabs
        for(let tab of win.tabs) {
            log.info('   ' + tab.id.toString() + ': ' + tab.title);
            createNodeForTab(tab, win_node_id);
        }
    }

    return win_node_id;
} //createNodeForWindow

function createNodeForClosedWindow(win_data)
{
    let shouldCollapse = getBoolSetting('collapse-trees-on-startup');
    let win_node_id = treeobj.create_node(null,
            {   text: win_data.text
                //, 'icon': 'visible-window-icon'   // use the default icon
                , li_attr: { class: WIN_CLASS }
                , state: { 'opened': !shouldCollapse }
                , data: winState(false, WIN_KEEP)
            });

    addWindowNodeActions(win_node_id);

    if(typeof(win_data.tabs) !== 'undefined') {
        for(let tab_data of win_data.tabs) {
            //log.info('   ' + tab_data.text);
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
        if(typeof(chrome.runtime.lastError) === 'undefined') {
            let parsed = items[STORAGE_KEY];    // auto JSON.parse
            if(Array.isArray(parsed)) {

                //log.info('Loading:');
                //log.info(parsed);

                for(let win_data of parsed) {
                    createNodeForClosedWindow(win_data);
                }
            } //endif is array
        } //endif loaded OK

        // Even if there was an error, call the next action so that
        // the initialization can complete.
        if(typeof next_action !== 'function') return;
        next_action();
    });
} //loadSavedWindowsIntoTree

// Debug helper, so uses console.log() directly.
function DBG_printSaveData()
{
    chrome.storage.local.get(STORAGE_KEY, function(items) {
        if(typeof(chrome.runtime.lastError) !== 'undefined') {
            console.log(chrome.runtime.lastError);
        } else {
            let parsed = items[STORAGE_KEY];
            console.log('Save data:');
            console.log(parsed);
        }
    });
} //DBG_printSaveData()

//////////////////////////////////////////////////////////////////////////
// jstree callbacks //

/// Process clicks on items in the tree.  Also works for keyboard navigation
/// with arrow keys and Enter.
function treeOnSelect(evt, evt_data)
{
    //log.info(evt_data.node);
    if(typeof(evt_data.node) === 'undefined') return;

    let node = evt_data.node;
    let node_data = node.data;
    let win_id;     // If assigned, this window will be brought to the front
                    // at the end of this function.
    if(typeof node_data === 'undefined') return;

    // TODO figure out why this doesn't work: treeobj.deselect_node(node, true);
    treeobj.deselect_all(true);
        // Clear the selection.  True => no event due to this change.

    if(node_data.nodeType == 'tab' && node_data.isOpen) {   // An open tab
        chrome.tabs.highlight({
            windowId: node_data.tab.windowId,
            tabs: [node_data.tab.index]     // Jump to the clicked-on tab
        });
        win_id = node_data.tab.windowId;

    } else if(node_data.nodeType == 'window' && node_data.isOpen) {    // An open window
        win_id = node_data.win.id

    } else if(!node_data.isOpen &&
                (node_data.nodeType == 'window' ||
                 node_data.nodeType == 'tab') ) {
        // A closed window or tab.  Make sure we have the window.
        let win_node;
        let win_node_data;

        if(node_data.nodeType == 'window') {
            win_node = node;
            win_node_data = node_data;

        } else {    // A closed tab
            let parent_node_id = node.parent;
            if(typeof parent_node_id === undefined) return;
            let parent_node = treeobj.get_node(parent_node_id);
            if(typeof parent_node === undefined) return;

            win_node = parent_node;
            win_node_data = parent_node.data;
        }

        // Grab the URLs for all the tabs
        let urls=[];
        for(let child_id of win_node.children) {
            let child_data = treeobj.get_node(child_id).data;
            urls.push(child_data.url);
        }

        // Open the window
        window_is_being_restored = true;
        chrome.windows.create(
            {
                url: urls
              , focused: true
              , left: newWinSize.left
              , top: newWinSize.top
              , width: newWinSize.width
              , height: newWinSize.height
            },
            function(win) {
                // Update the tree and node mappings
                log.info('Adding nodeid map for winid ' + win.id);
                mdWindows.add({win_id: win.id, node_id: win_node.id, win:win});

                win_node_data.isOpen = true;
                win_node_data.keep = true;      // just in case
                win_node_data.win = win;
                treeobj.set_icon(win_node.id, 'visible-saved-window-icon');

                twiddleVisibleStyle(win_node, true);

                treeobj.open_node(win_node);

                for(let idx=0; idx < win.tabs.length; ++idx) {
                    let tab_node_id = win_node.children[idx];
                    let tab_data = treeobj.get_node(tab_node_id).data;
                    tab_data.isOpen = true;
                    tab_data.tab = win.tabs[idx];

                    { //debug
                        if(mdTabs.by_tab_id(tab_data.tab.id)!==undefined) {
                            console.log('About to create extra record for tab '
                                    + tab_data.tab.id);
                        }
                    }
                    mdTabs.add({tab_id: tab_data.tab.id, node_id: tab_node_id,
                        tab: win.tabs[idx]});
                }
            } //create callback
        );

    } else {    // it's a nodeType we don't know how to handle.
        log.error('treeOnSelect: Unknown node ' + node_data);
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

    // Save the window's size
    if(win.type === 'normal') {
        winSizes[win.id] = getWindowSizeFromWindowRecord(win);
        newWinSize = winSizes[win.id];
            // Chrome appears to use the last-resized window as its size
            // template even when you haven't closed it, so do similarly.
            // ... Well, maybe the last-resized window with a non-blank tab ---
            // not entirely sure.
    }

    createNodeForWindow(win, WIN_NOKEEP);
    saveTree();     // for now, brute-force save on any change.
} //winOnCreated

function winOnRemoved(win_id)
{
    // Stash the size of the window being closed as the size for
    // reopened windows.
    if(win_id in winSizes) {
        newWinSize = winSizes[win_id];
        delete winSizes[win_id];
    }

    let node_id = mdWindows.by_win_id(win_id, 'node_id');
    if(typeof node_id === 'undefined') return;

    let node = treeobj.get_node(node_id);
    if(typeof node === 'undefined') return;

    winOnFocusChanged(chrome.windows.WINDOW_ID_NONE);   // Clear the highlights.

    if(node.data.keep) {
        node.data.isOpen = false;   // because it's already gone
        actionCloseWindow(node_id, node, null, null);
            // Since it was saved, leave it saved.  You can only get rid
            // of saved sessions by X-ing them expressly (actionDeleteWindow).
        saveTree();     // TODO figure out if we need this.
    } else {
        // Not saved - just toss it.
        actionDeleteWindow(node_id, node, null, null);
            // This removes the node's children also.
            // actionDeleteWindow also saves the tree, so we don't need to.
    }
} //winOnRemoved

/// Update the highlight for the current window.  Note: this does not always
/// seem to fire when switching to a non-Chrome window.
/// See https://stackoverflow.com/q/24307465/2877364 - onFocusChanged
/// is known to be a bit flaky.
function winOnFocusChanged(win_id)
{
    //log.info('Window focus-change triggered: ' + win_id);

    chrome.windows.getLastFocused({}, function(win){
        let new_win_id;
        if(!win.focused) {
            new_win_id = -1;
        } else {
            new_win_id = win.id;
        }

        // Clear the focus highlights if we are changing windows.
        // Avoid flicker if the selection is staying in the same window.
        if(new_win_id === currently_focused_winid) return;

        //log.info('Clearing focus classes');
        $('.' + WIN_CLASS + ' > a').removeClass(FOCUSED_WIN_CLASS);

        currently_focused_winid = new_win_id;

        if(new_win_id == chrome.windows.WINDOW_ID_NONE) return;

        // Get the window
        let window_node_id = mdWindows.by_win_id(new_win_id, 'node_id');
        //log.info('Window node ID: ' + window_node_id);
        if(typeof window_node_id === 'undefined') return;
            // E.g., if new_win_id corresponds to this view.

        // Make the window's entry bold, but no other entries.
        // This seems to need to run after a yield when dragging
        // tabs between windows, or else the FOCUSED_WIN_CLASS
        // doesn't seem to stick.

        setTimeout(function(){
            //log.info('Setting focus class');
            $('#' + window_node_id + ' > a').addClass(FOCUSED_WIN_CLASS);
            //log.info($('#' + window_node_id + ' > a'));
        },0);
    });

} //winOnFocusChanged

/// Process creation of a tab.  NOTE: in Chrome 60.0.3112.101, we sometimes
/// get two consecutive tabs.onCreated events for the same tab.  Therefore,
/// we check for that here.
function tabOnCreated(tab)
{
    log.info('Tab created:');
    log.info(tab);

    let win_node_id = mdWindows.by_win_id(tab.windowId, 'node_id')
    if(typeof win_node_id === 'undefined') return;

    let tab_node_id;

    // See if this is a duplicate of an existing tab
    let tab_val = mdTabs.by_tab_id(tab.id);

    if(tab_val === undefined) {     // If not, create the tab
        let tab_node_id = createNodeForTab(tab, win_node_id);   // Adds at end
        treeobj.move_node(tab_node_id, win_node_id, tab.index);
            // Put it in the right place
    } else {
        console.log('   - That tab already exists.');
        treeobj.move_node(tab_val.node_id, win_node_id, tab.index);
            // Just put it where it now belongs.
    }

    updateTabIndexValues(win_node_id);

    saveTree();
} //tabOnCreated

function tabOnUpdated(tabid, changeinfo, tab)
{
    log.info('Tab updated: ' + tabid);
    log.info(changeinfo);
    log.info(tab);

    let tab_node_id = mdTabs.by_tab_id(tabid, 'node_id');
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

/// Handle movements of tabs or tab groups within a window.
function tabOnMoved(tabid, moveinfo)
{
    log.info('Tab moved: ' + tabid);
    log.info(moveinfo);

    let from_idx = moveinfo.fromIndex;
    let to_idx = moveinfo.toIndex;

    // Get the parent (window)
    let window_node_id = mdWindows.by_win_id(moveinfo.windowId, 'node_id');
    if(typeof window_node_id === 'undefined') return;

    // Get the tab's node
    let tab_node_id = mdTabs.by_tab_id(tabid, 'node_id');
    if(typeof tab_node_id === 'undefined') return;

    // Move the tree node
    //log.info('Moving tab from ' + from_idx.toString() + ' to ' +
    //            to_idx.toString());

    // As far as I can tell, in jstree, indices point between list
    // elements.  E.g., with n items, index 0 is before the first and
    // index n is after the last.  However, Chrome tab indices point to
    // the tabs themselves, 0..(n-1).  Therefore, if we are moving
    // right, bump the index by 1 so we will be _after_ that item
    // rather than _before_ it.
    // See the handling of `pos` values of "before" and "after"
    // in the definition of move_node() in jstree.js.
    let jstree_new_index =
            to_idx+(to_idx>from_idx ? 1 : 0);

    treeobj.move_node(tab_node_id, window_node_id, jstree_new_index);

    // Update the indices of all the tabs in this window.  This will update
    // the old tab and the new tab.
    updateTabIndexValues(window_node_id);

    saveTree();
} //tabOnMoved

function tabOnActivated(activeinfo)
{
    log.info('Tab activated:');
    log.info(activeinfo);

    winOnFocusChanged(activeinfo.windowId);

    // Use this if you want the selection to track the open tab.
    if(false) {
        // Get the tab's node
        let tab_node_id = mdTabs.by_tab_id(activeinfo.tabId, 'node_id');
        if(typeof tab_node_id === 'undefined') return;

        treeobj.deselect_all();
        treeobj.select_node(tab_node_id);
    }

    //let parent_node = treeobj.get_node(parent_node_id);
    //if(typeof parent_node === 'undefined') return;

    // No need to save --- we don't save which tab is active.
} //tabOnActivated

function tabOnRemoved(tabid, removeinfo)
{
    // If the window is closing, do not remove the tab records.
    // The cleanup will be handled by winOnRemoved().
    log.info('Tab being removed: ' + tabid);
    log.info(removeinfo);

    if(removeinfo.isWindowClosing) return;

    let window_node_id = mdWindows.by_win_id(removeinfo.windowId, 'node_id');
    if(typeof window_node_id === 'undefined') return;

    {   // Keep the locals here out of the scope of the closure below.
        // Get the parent (window)
        let window_node = treeobj.get_node(window_node_id);
        if(typeof window_node === 'undefined') return;

        // Get the tab's node
        let tab_node_id = mdTabs.by_tab_id(tabid, 'node_id');
        if(typeof tab_node_id === 'undefined') return;
        let tab_node = treeobj.get_node(tab_node_id);
        if(typeof tab_node === 'undefined') return;

        // Remove the node
        let tab_val = mdTabs.by_tab_id(tabid);
        mdTabs.remove_value(tab_val);
            // So any events that are triggered won't try to look for a
            // nonexistent tab.
        treeobj.delete_node(tab_node);
    }

    // Refresh the tab.index values for the remaining tabs
    updateTabIndexValues(window_node_id);

    saveTree();
} //tabOnRemoved

function tabOnDetached(tabid, detachinfo)
{
    // Don't save here?  Do we get a WindowCreated if the tab is not
    // attached to another window?
    log.info('Tab being detached: ' + tabid);
    log.info(detachinfo);

    // Rather than stashing the tab's data, for now, just trash it and
    // re-create it when it lands in its new home.  This seems to work OK.
    tabOnRemoved(tabid,
            {isWindowClosing: false, windowId:detachinfo.oldWindowId}
    );
} //tabOnDetached

function tabOnAttached(tabid, attachinfo)
{
    log.info('Tab being attached: ' + tabid);
    log.info(attachinfo);
    // Since we forgot about the tab in tabOnDetached, re-create it
    // now that it's back.
    chrome.tabs.get(tabid, tabOnCreated);
} //tabOnAttached

function tabOnReplaced(addedTabId, removedTabId)
{
    // Do we get this?
    log.info('Tab being replaced: added ' + addedTabId + '; removed ' +
            removedTabId);
} //tabOnReplaced

//////////////////////////////////////////////////////////////////////////
// DOM event handlers //

function eventOnResize(evt)
{
    // Clear any previous timer we may have had running
    if(typeof resize_save_timer_id !== 'undefined') {
        window.clearTimeout(resize_save_timer_id);
        resize_save_timer_id = undefined;
    }

    let size_data = getWindowSize(window);

    // Save the size, but only after two seconds go by.  This is to avoid
    // saving until the user is actually done resizing.
    resize_save_timer_id = window.setTimeout(
        function() {
            log.info('Saving new size ' + size_data.toString());

            let to_save = {};
            to_save[LOCN_KEY] = size_data;
            chrome.storage.local.set(to_save,
                    function() {
                        if(typeof(chrome.runtime.lastError) === 'undefined') {
                            return;     // Saved OK
                        }
                        log.error("TabFern: couldn't save location: " +
                                        chrome.runtime.lastError.toString());
                    });
        },
        2000);

} //eventOnResize

//////////////////////////////////////////////////////////////////////////
// Startup / shutdown //

// This is done in vaguely continuation-passing style.  TODO make it cleaner.
// Maybe use promises?

/// The last function to be called after all other initialization has
/// completed successfully.
function initTreeFinal()
{
    did_init_complete = true;
    // Assume the document is loaded by this point.
    $(INIT_MSG_SEL).css('display','none');    // just in case
} //initTreeFinal()

function initTree4(items)
{ // move the popup window to its last position/size
    if(typeof(chrome.runtime.lastError) === 'undefined') {
        // If there was an error (e.g., nonexistent key), just
        // accept the default size.
        let parsed = items[LOCN_KEY];
        if( (parsed !== null) && (typeof parsed === 'object') ) {
            // + and || are to provide some sensible defaults - thanks to
            // https://stackoverflow.com/a/7540412/2877364 by
            // https://stackoverflow.com/users/113716/user113716
            chrome.windows.update(my_winid, {
                  'left': +parsed.left || 0
                , 'top': +parsed.top|| 0
                , 'width': +parsed.width || 300
                , 'height': +parsed.height || 600
            });
        }
    } //endif no error

    initTreeFinal();
} //initTree4()

function initTree3()
{
    // Set event listeners
    $('#maintree').on('changed.jstree', treeOnSelect);

    chrome.windows.onCreated.addListener(winOnCreated);
    chrome.windows.onRemoved.addListener(winOnRemoved);
    chrome.windows.onFocusChanged.addListener(winOnFocusChanged);

    // Chrome tabs API, listed in the order given in the API docs at
    // https://developer.chrome.com/extensions/tabs
    chrome.tabs.onCreated.addListener(tabOnCreated);
    chrome.tabs.onUpdated.addListener(tabOnUpdated);
    chrome.tabs.onMoved.addListener(tabOnMoved);
    //onSelectionChanged: deprecated
    //onActiveChanged: deprecated
    chrome.tabs.onActivated.addListener(tabOnActivated);
    //onHighlightChanged: deprecated
    //onHighlighted: not yet implemented
    chrome.tabs.onDetached.addListener(tabOnDetached);
    chrome.tabs.onAttached.addListener(tabOnAttached);
    chrome.tabs.onRemoved.addListener(tabOnRemoved);
    chrome.tabs.onReplaced.addListener(tabOnReplaced);
    //onZoomChange: not yet implemented, and we probably won't ever need it.

    // Move this view to where it was, if anywhere
    chrome.storage.local.get(LOCN_KEY, initTree4);
} //initTree3

function addOpenWindowsToTree(winarr)
{
    let dat = {};
    let focused_win_id;

    for(let win of winarr) {
        //log.info('Window ' + win.id.toString());
        if(win.focused) {
            focused_win_id = win.id;
        }
        createNodeForWindow(win, WIN_NOKEEP);
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
        log.error("Couldn't get win ID: " + chrome.runtime.lastError);
        // TODO add a "couldn't load" message to the popup.
        return;     // This actually is fatal.
    }
    my_winid = win_id;

    log.info('TabFern view.js initializing tree in window ' + win_id.toString());

    let jstreeConfig = {
        'plugins': ['actions', 'wholerow'] // TODO add state plugin
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
    };

    if ( getBoolSetting('ContextMenu.Enabled', false) ) {
        jstreeConfig.plugins.push('contextmenu');
        jstreeConfig.contextmenu = {
            items: window._tabFernContextMenu.generateJsTreeMenuItems
        };          // TODO put that in our context since we have mdTabs and mdWindows
        $.jstree.defaults.contextmenu.select_node = false;
        $.jstree.defaults.contextmenu.show_at_node = false;
    }

    // Create the tree
    $('#maintree').jstree(jstreeConfig);
    treeobj = $('#maintree').jstree(true);

    window._tabFernContextMenu.installTreeEventHandler(treeobj, Shortcuts);

    // Load the tree
    loadSavedWindowsIntoTree(initTree2);
} //initTree1()

function initTree0()
{
    log.info('TabFern view.js initializing view');

    // Stash our current size, which is the default window size.
    newWinSize = getWindowSize(window);

    // Get our Chrome-extensions-API window ID from the background page.
    // I don't know a way to get this directly from the JS window object.
    chrome.runtime.sendMessage(MSG_GET_VIEW_WIN_ID, initTree1);
} //initTree0


function shutdownTree()
{   // This appears to be called reliably.  This will also remove any open,
    // unsaved windows from the save data so they won't be reported as crashed
    // once #23 is implemented.

    // // A bit of logging -
    // // from https://stackoverflow.com/a/3840852/2877364
    // // by https://stackoverflow.com/users/449477/pauan
    // let background = chrome.extension.getBackgroundPage();
    // background.console.log('popup closing');

    if(did_init_complete) {
        saveTree(false);    // false => don't save visible, non-saved windows
    }
} //shutdownTree()

/// Show a warning if initialization hasn't completed.
function initIncompleteWarning()
{
    if(!did_init_complete) {
        // Assume the document is loaded by this point.
        $(INIT_MSG_SEL).css('display','block');
    }
} //initIncompleteWarning()

//////////////////////////////////////////////////////////////////////////
// Hamburger menu //

/// Open a new window with the TabFern homepage.  Also remove the default
/// tab that appears because we are letting the window open at the
/// default size.  Yes, this is quite ugly.
function hamAboutWindow()
{
    chrome.windows.create(
        function(win) {
            if(typeof(chrome.runtime.lastError) === 'undefined') {
                chrome.tabs.create({windowId: win.id, url: 'https://cxw42.github.io/TabFern/'},
                    function(keep_tab) {
                        if(typeof(chrome.runtime.lastError) === 'undefined') {
                            chrome.tabs.query({windowId: win.id, index: 0},
                                function(tabs) {
                                    if(typeof(chrome.runtime.lastError) === 'undefined') {
                                        chrome.tabs.remove(tabs[0].id,
                                            ignore_chrome_error
                                        ); //tabs.remove
                                    }
                                } //function(tabs)
                            ); //tabs.query
                        }
                    } //function(keep_tab)
                ); //tabs.create
            }
        } //function(win)
    ); //windows.create
} //hamAboutWindow()

function hamBackup()
{
    let date_tag = new Date().toISOString().replace(/:/g,'.');
        // DOS filenames can't include colons.
        // TODO use local time - maybe
        // https://www.npmjs.com/package/dateformat ?
    let filename = 'TabFern backup ' + date_tag + '.json';

    chrome.storage.local.get(STORAGE_KEY, function(items) {
        if(typeof(chrome.runtime.lastError) === 'undefined') {
            let parsed = items[STORAGE_KEY];    // auto JSON.parse
            if(Array.isArray(parsed)) {
                Fileops.Export(document, JSON.stringify(parsed), filename);
            } //endif is array
        } //endif loaded OK
    });
} //hamBackup()

function getMenuItems(node, UNUSED_proxyfunc, e)
{
    return {
        backupItem: {
            label: "Backup now",
            action: hamBackup
        }
        , infoItem: {
            label: "About, help, and credits",
            action: hamAboutWindow
        }
    };
} //getMenuItems()

function initHamburger()
{
    Hamburger = HamburgerMenuMaker('#hamburger-menu', getMenuItems);
} //initHamburger

//////////////////////////////////////////////////////////////////////////
// MAIN //

// Timer to display the warning message if initialization doesn't complete
// quickly enough.
window.setTimeout(initIncompleteWarning, INIT_TIME_ALLOWED_MS);

// Main events
window.addEventListener('load', initTree0, { 'once': true });
window.addEventListener('unload', shutdownTree, { 'once': true });
window.addEventListener('resize', eventOnResize);
    // This doesn't detect window movement without a resize.  TODO implement
    // something from https://stackoverflow.com/q/4319487/2877364 to
    // deal with that.

// Hamburger menu
window.addEventListener('load', initHamburger, { 'once': true });

// Install keyboard shortcuts.  This includes the keyboard listener for
// context menus.
window._tabFernShortcuts.install(
    {
        window: window,
        keybindings: window._tabFernShortcuts.keybindings.default,
        drivers: [window._tabFernShortcuts.drivers.dmaruo_keypress]
    },
    function initialized(err) {
        if ( err ) {
            console.log('Failed loading a shortcut driver!  Initializing context menu with no shortcut driver.  ' + err);
            window._tabFernContextMenu.installEventHandler(window, document, null);
        } else {
            Shortcuts = window._tabFernShortcuts;
            window._tabFernContextMenu.installEventHandler(window, document, window._tabFernShortcuts);
        }
    }
);

//TODO test what happens when Chrome exits.  Does the background page need to
//save anything?

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
