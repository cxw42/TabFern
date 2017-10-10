// tree.js: main script for tree.html in the popup window of TabFern
// cxw42, 2017
// See /doc/design.md for information about notation and organization.

// TODO break this into some separate modules

console.log('Loading TabFern ' + TABFERN_VERSION);

//////////////////////////////////////////////////////////////////////////
// Modules //

// Hacks so I can keep everything in the global scope for ease of
// use or inspection in the console while developing.
// TODO figure out a better way.
//  --> TODO make this a requirejs module and move the loader into a
//      standalone file.  Then the loader can populate the globals if
//      running in development mode, and not otherwise.  The loader can also
//      have a user-callable function to populate the globals, e.g., for
//      debugging in the deployed package.

// Note: globals are `var`, rather than `let`, so they can be accessed on
// `window` from the developer console.  `let` variables are not attached
// to the global object.

/// Modules loaded via requirejs
var Modules = {};

/// Constants loaded from view/const.js, for ease of access
var K;

/// Shorthand access to the details, view/item_details.js
var D;

/// Shorthand access to the tree, view/item_tree.js ("Tree")
var T;

/// Shorthand access to the item routines, view/item.js ("Item")
var I;

/// HACK - a global for loglevel because typing `Modules.log` everywhere is a pain.
var log;

/// Shorthand for asynquence
var ASQ;

//////////////////////////////////////////////////////////////////////////
// Globals //

// - Operation state -
var my_winid;                   ///< window ID of this popup window

/// Window ID of the currently-focused window, as best we understand it.
var currently_focused_winid = null;

/// HACK to avoid creating extra tree items.
var window_is_being_restored = false;

/// The size of the last-closed window, to be used as the
/// size of newly-opened windows (whence the name).
/// Should always have a valid value.
var newWinSize = {left: 0, top: 0, width: 300, height: 600};

/// The sizes of the currently-open windows, for use in setting #newWinSize.
/// The size of this popup, and other non-normal windows, is not tracked here.
var winSizes={};

// TODO use content scripts to catch window resizing, a la
// https://stackoverflow.com/q/13141072/2877364

/// Whether to show a notification of new features
var ShowWhatIsNew = false;

/// Array of URLs of the last-deleted window
var lastDeletedWindow;

/// Did initialization complete successfully?
var did_init_complete = false;

/// Are we running in development mode (unpacked)?
var is_devel_mode = false;

// - Module instances -

/// The hamburger menu
var Hamburger;

/// An escaper
var Esc;

/// The module that handles <Shift> bypassing of the jstree context menu
var Bypasser;

//////////////////////////////////////////////////////////////////////////
// Initialization //

/// Init those of our globals that don't require any data to be loaded.
/// Call after Modules has been populated.
function local_init()
{
    log = Modules.loglevel;
    log.setDefaultLevel(log.levels.DEBUG);  // TODO set to WARN for production

    Esc = Modules.justhtmlescape;
    K = Modules['view/const'];
    D = Modules['view/item_details'];
    T = Modules['view/item_tree'];
    I = Modules['view/item'];
    ASQ = Modules['asynquence-contrib'];

    // Check development status.  Thanks to
    // https://stackoverflow.com/a/12833511/2877364 by
    // https://stackoverflow.com/users/1143495/konrad-dzwinel and
    // https://stackoverflow.com/users/934239/xan
    chrome.management.getSelf(function(info){
        if(info.installType === 'development') is_devel_mode = true;
    });

} //init()

//////////////////////////////////////////////////////////////////////////
// General utility routines //

//////////////////////////////////////////////////////////////////////////
// DOM Manipulation //

/// Set the tab.index values of the tab nodes in a window.  Assumes that
/// the nodes are in the proper order in the tree.
/// \pre    #win_node_id is the id of a node that both exists and represents
///         a window.
function updateTabIndexValues(win_node_id)
{
    // NOTE: later, when adding nested trees, see
    // https://stackoverflow.com/a/10823248/2877364 by
    // https://stackoverflow.com/users/106224/boltclock

    let win_node = T.treeobj.get_node(win_node_id);
    if(win_node===false) return;

    let tab_index=0;
    for(let tab_node_id of win_node.children) {
        let tab_val = D.tabs.by_node_id(tab_node_id);
        if(tab_val) tab_val.index = tab_index;
        ++tab_index;
    }
} //updateTabIndexValues

/// Get the size of a window, as an object
/// @param win {DOM window} The window
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
/// @param win {Chrome Window} The window record
function getWindowSizeFromWindowRecord(win)
{
    return {
          'left': win.left || 0
        , 'top': win.top || 0
        , 'width': win.width || 300
        , 'height': win.height || 600
    };
} //getWindowSize

/// Clear flags on all windows; leave tabs alone.
function unflagAllWindows() {
    //log.trace('unflagAllWindows');
    T.treeobj.clear_flags_by_multitype([K.NT_WIN, K.NST_OPEN],
            undefined,  // any parent
            true        // true => don't need an event
    );
};

//////////////////////////////////////////////////////////////////////////
// Saving //

/// Wrap up the save data with a magic header and the current version number
function makeSaveData(data)
{
    return { tabfern: 42, version: K.SAVE_DATA_AS_VERSION, tree: data };
} //makeSaveData()

/// Save the tree to Chrome local storage.
/// @param save_ephemeral_windows {Boolean}
///     whether to save information for open, unsaved windows (default true)
/// @param cbk {function}
///     If provided, will be called after saving completes.
///     Called as cbk(err, save_data).  On success, err is null.
function saveTree(save_ephemeral_windows = true, cbk = undefined)
{
    if(log.getLevel <= log.levels.TRACE) console.log('saveTree');

    // Get the raw data for the whole tree.  Can't use $(...) because closed
    // tree nodes aren't in the DOM.
    let root_node = T.treeobj.get_node($.jstree.root);    //from get_json() src
    if(!root_node || !root_node.children) {
        if(typeof cbk === 'function') cbk(new Error("Can't get root node"));
        return;
    }

    let result = [];    // the data to be saved

    // Clean up the data
    for(let win_node_id of root_node.children) {
        let win_node = T.treeobj.get_node(win_node_id);

        // Don't save windows with no children
        if( (typeof(win_node.children) === 'undefined') ||
            (win_node.children.length === 0) ) {
            continue;
        }

        let win_val = D.windows.by_node_id(win_node.id);
        if(!win_val) continue;

        // Don't save ephemeral windows unless we've been asked to.
        let is_ephemeral = win_val.isOpen && (win_val.keep===K.WIN_NOKEEP);
        if( is_ephemeral && !save_ephemeral_windows ) continue;

        let result_win = {};       // what will hold our data

        result_win.raw_title = win_val.raw_title;
        result_win.tabs = [];
        if(is_ephemeral) result_win.ephemeral = true;
            // Don't bother putting it in if we don't need it.

        // Stash the tabs.  No recursion at this time.
        if(win_node.children) {
            for(let tab_node_id of win_node.children) {
                let tab_val = D.tabs.by_node_id(tab_node_id);
                if(!tab_val) continue;

                let thistab = {};
                thistab.raw_title = tab_val.raw_title;
                thistab.raw_url = tab_val.raw_url;
                // TODO save favIconUrl?

                if(T.treeobj.has_multitype(tab_node_id, K.NST_TOP_BORDER)) {
                    thistab.bordered = true;
                }

                if(tab_val.raw_bullet) thistab.raw_bullet = tab_val.raw_bullet;
                result_win.tabs.push(thistab);
            }
        }

        result.push(result_win);
    } //foreach window

    // Save it
    let to_save = {};
    to_save[K.STORAGE_KEY] = makeSaveData(result);
        // storage automatically does JSON.stringify
    chrome.storage.local.set(to_save,
        function() {
            if(typeof(chrome.runtime.lastError) === 'undefined') {
                if(typeof cbk === 'function') {
                    cbk(null, to_save[K.STORAGE_KEY]);
                }
                return;     // Saved OK
            }
            let msg = "TabFern: couldn't save: " +
                            chrome.runtime.lastError.toString();
            log.error(msg);
            window.alert(msg);     // The user needs to know
            if(typeof cbk === 'function') cbk(new Error(msg));
        }
    ); //storage.local.set
} //saveTree()

//////////////////////////////////////////////////////////////////////////
// jstree-action callbacks //

/// Wrapper to call jstree-action style callbacks from jstree contextmenu
/// actions
function actionAsContextMenuCallback(action_function)
{
    return function(data) {
        // data.item, reference, element, position exist
        let node = T.treeobj.get_node(data.reference);
        action_function(node.id, node, null, data.element);
    };
} //actionAsContextMenuCallback

/// Prompt the user for a new name for a window, and rename if the user
/// hits OK.
function actionRenameWindow(node_id, node, unused_action_id, unused_action_el)
{
    let win_val = D.windows.by_node_id(node_id);
    if(!win_val) return;

    // TODO replace window.prompt with an in-DOM GUI.
    let win_name = window.prompt('New window name?',
            I.remove_unsaved_markers(I.get_win_raw_text(win_val)));
    if(win_name === null) return;   // user cancelled

    // A bit of a hack --- if the user hits OK on the default text for a
    // no-name window, change it to "Saved tabs."  TODO find a better way.
    if(win_name === 'Unsaved') {
        win_val.raw_title = 'Saved tabs';
    } else {
        win_val.raw_title = win_name;
    }

    I.remember(node_id, false);
        // assume that a user who bothered to rename a node
        // wants to keep it.  false => do not change the raw_title,
        // since the user just specified it.

    saveTree();
} //actionRenameWindow()

/// Mark a window as K.NOKEEP but don't close it
function actionForgetWindow(node_id, node, unused_action_id, unused_action_el)
{
    let win_val = D.windows.by_node_id(node_id);
    if(!win_val) return;

    I.mark_as_unsaved(win_val);
    I.refresh_label(node_id);

    if(win_val.isOpen) {    // should always be true, but just in case...
        //T.treeobj.set_type(node, K.NT_WIN_EPHEMERAL);
        T.treeobj.del_multitype(node, K.NST_SAVED);
        T.treeobj.add_multitype(node, K.NST_OPEN);
    }

    saveTree();
} //actionForgetWindow()

/// Mark a window as K.KEEP but don't close it
function actionRememberWindow(node_id, node, unused_action_id, unused_action_el)
{
    let win_val = D.windows.by_node_id(node_id);
    if(!win_val) return;

    I.remember(node_id);
    I.refresh_label(node_id);
    T.treeobj.add_multitype(node, K.NST_SAVED);

    saveTree();
} //actionForgetWindow()

/// Close a window, but don't delete its tree nodes.  Used for saving windows.
/// ** The caller must call saveTree() --- actionCloseWindow() does not.
function actionCloseWindow(node_id, node, unused_action_id, unused_action_el)
{
    let win_val = D.windows.by_node_id(node_id);
    if(!win_val) return;
    let win = win_val.win;

    // Mark the tree node closed
    win_val.win = undefined;
        // Prevents winOnRemoved() from calling us to handle the removal!
    D.windows.change_key(win_val, 'win_id', K.NONE);
        // Can't access by win_id, but can still access by node_id.

    // TODO winOnFocusChanged(NONE, true) ?

    // Close the window
    if(win_val.isOpen && win) {
        win_val.keep = K.WIN_KEEP;
            // has to be before winOnRemoved fires.  TODO cleanup -
            // maybe add an `is_closing` flag to `win_val`?
        chrome.windows.remove(win.id, K.ignore_chrome_error);
        // Don't try to close an already-closed window.
        // Ignore exceptions - when we are called from winOnRemoved,
        // the window is already gone, so the remove() throws.
        // See https://stackoverflow.com/a/45871870/2877364 by cxw
    }

    win_val.isOpen = false;
    I.remember(node_id);
    T.treeobj.del_multitype(node_id, K.NST_OPEN);

    // Collapse the tree, if the user wants that
    if(getBoolSetting("collapse-tree-on-window-close")) {
        T.treeobj.close_node(node);
        T.treeobj.redraw_node(node);    // to be safe
    }

    // Mark the tabs in the tree node closed.
    for(let tab_node_id of node.children) {
        let tab_val = D.tabs.by_node_id(tab_node_id);
        if(!tab_val) continue;

        tab_val.tab = undefined;
        tab_val.win_id = K.NONE;
        tab_val.index = K.NONE;
        tab_val.isOpen = false;
        T.treeobj.del_multitype(tab_node_id, K.NST_OPEN);
        D.tabs.change_key(tab_val, 'tab_id', K.NONE);
        // raw_url and raw_title are left alone
    }

    T.treeobj.clear_flags();
        // On close, we can't know where the focus will go next.
} //actionCloseWindow

function actionDeleteWindow(node_id, node, unused_action_id, unused_action_el)
{
    // Close the window and adjust the tree
    actionCloseWindow(node_id, node, unused_action_id, unused_action_el);

    lastDeletedWindow = [];
    // Remove the tabs from D.tabs
    for(let tab_node_id of node.children) {
        let tab_val = D.tabs.by_node_id(tab_node_id);
        if(!tab_val) continue;
        D.tabs.remove_value(tab_val);
        // Save the URLs for "Restore last deleted"
        lastDeletedWindow.push(tab_val.raw_url);
    }

    // Remove the window's node and value
    let scrollOffsets = [window.scrollX, window.scrollY];
    T.treeobj.delete_node(node_id);   //also deletes child nodes
    window.scrollTo(...scrollOffsets);

    let win_val = D.windows.by_node_id(node_id);
    D.windows.remove_value(win_val);

    saveTree();
} //actionDeleteWindow

/// Toggle the top border on a node.  This is a hack until I can add
/// dividers.
function actionToggleTabTopBorder(node_id, node, unused_action_id, unused_action_el)
        //node_id, node, unused_action_id, unused_action_el)
{
    let tab_val = D.tabs.by_node_id(node_id);
    if(!tab_val) return;

    // Note: adjust this if you add another NT_TAB type.
    if(!T.treeobj.has_multitype(node_id, K.NST_TOP_BORDER)) {
        T.treeobj.add_multitype(node_id, K.NST_TOP_BORDER);
    } else {
        T.treeobj.del_multitype(node_id, K.NST_TOP_BORDER);
    }

    I.remember(node.parent);
        // assume that a user who bothered to add a divider to a tab
        // wants to keep the window the tab is in.

    saveTree();
} //actionToggleTabTopBorder

/// Edit a node's bullet
function actionEditBullet(node_id, node, unused_action_id, unused_action_el)
{
    let {ty, val} = I.get_node_tyval(node_id);
    if(!val) return;

    // TODO replace window.prompt with an in-DOM GUI.
    let new_bullet = window.prompt('Note for this ' +
            (ty === K.IT_WINDOW ? 'window' : 'tab') + '?',
            val.raw_bullet || '');
    if(new_bullet === null) return;   // user cancelled

    val.raw_bullet = new_bullet;
    I.refresh_label(node_id);

    I.remember(node.parent);
        // assume that a user who bothered to add a note
        // wants to keep the window the note is in.

    saveTree();
} //actionEditBullet

//////////////////////////////////////////////////////////////////////////
// Tree-node creation //

// = = = Tabs = = = = = = = = = = = = = = = = = =

function addTabNodeActions(win_node_id)
{
    T.treeobj.make_group(win_node_id, {
        selector: 'div.jstree-wholerow',
        child: true,
        class: K.ACTION_GROUP_WIN_CLASS // + ' jstree-animated' //TODO?
    });

    T.treeobj.add_action(win_node_id, {
        id: 'editBullet',
        class: 'fff-pencil ' + K.ACTION_BUTTON_WIN_CLASS,
        text: '&nbsp;',
        grouped: true,
        callback: actionEditBullet,
        dataset: { action: 'editBullet' }
    });
} //addTabNodeActions

/// Create a tree node for an open tab.
/// @param ctab {Chrome Tab} the tab record
function createNodeForTab(ctab, parent_node_id)
{
    { //  debug
        let tab_val = D.tabs.by_tab_id(ctab.id);
        if(tab_val) {
            log.error('Refusing to create node for existing tab ' + ctab.id);
            return;
        }
    } // /debug

    let {node_id, val} = I.makeItemForTab(parent_node_id, ctab);
    addTabNodeActions(node_id);

    return node_id;
} //createNodeForTab

/// Create a tree node for a closed tab
/// @param tab_data_v1      V1 save data for the tab
/// @param parent_node_id   The node id for a closed window
/// @return node_id         The node id for the new tab
function createNodeForClosedTab(tab_data_v1, parent_node_id)
{
    let node_mtype = (tab_data_v1.bordered ? K.NST_TOP_BORDER : false);
    let {node_id, val} = I.makeItemForTab(
            parent_node_id, false,      // false => no Chrome window open
            tab_data_v1.raw_url,
            tab_data_v1.raw_title,
            node_mtype
    );
    if(tab_data_v1.raw_bullet) {
        val.raw_bullet = String(tab_data_v1.raw_bullet);
        I.refresh_label(node_id);
    }

    addTabNodeActions(node_id);

    return node_id;
} //createNodeForClosedTab

// = = = Windows = = = = = = = = = = = = = = = = =

function addWindowNodeActions(win_node_id)
{
    T.treeobj.make_group(win_node_id, {
        selector: 'div.jstree-wholerow',
        child: true,
        class: K.ACTION_GROUP_WIN_CLASS // + ' jstree-animated' //TODO?
    });

    T.treeobj.add_action(win_node_id, {
        id: 'renameWindow',
        class: 'fff-pencil ' + K.ACTION_BUTTON_WIN_CLASS,
        text: '&nbsp;',
        grouped: true,
        callback: actionRenameWindow,
        dataset: { action: 'renameWindow' }
    });

    T.treeobj.add_action(win_node_id, {
        id: 'closeWindow',
        class: 'fff-picture-delete ' + K.ACTION_BUTTON_WIN_CLASS,
        text: '&nbsp;',
        grouped: true,
        callback: actionCloseWindow,
        dataset: { action: 'closeWindow' }
    });

    T.treeobj.add_action(win_node_id, {
        id: 'deleteWindow',
        class: 'fff-cross ' + K.ACTION_BUTTON_WIN_CLASS,
        text: '&nbsp;',
        grouped: true,
        callback: actionDeleteWindow,
        dataset: { action: 'deleteWindow' }
    });

} //addWindowNodeActions

/// Create a tree node for open Chrome window #cwin.
/// @returns the tree-node ID, or undefined on error.
function createNodeForWindow(cwin, keep)
{
    // Don't put this popup window (view/index.html) in the list
    if( (typeof(cwin.id) !== 'undefined') &&
        (cwin.id == my_winid) ) {
        return;
    }

    let {node_id, val} = I.makeItemForWindow(cwin, keep);
    if(!node_id) return;    //sanity check

    addWindowNodeActions(node_id);

    if(cwin.tabs) {                      // new windows may have no tabs
        for(let tab of cwin.tabs) {
            log.info('   ' + tab.id.toString() + ': ' + tab.title);
            createNodeForTab(tab, node_id);
        }
    }

    return node_id;
} //createNodeForWindow

/// Create a tree node for a closed window
/// @param win_data_v1      V1 save data for the window
function createNodeForClosedWindow(win_data_v1)
{
    let is_ephemeral = Boolean(win_data_v1.ephemeral);  // missing => false
    let shouldCollapse = getBoolSetting(CFG_COLLAPSE_ON_STARTUP);

    log.info({'Closed window':win_data_v1.raw_title, 'is ephemeral?': is_ephemeral});

    // Make a node for a closed window
    let {node_id, val} = I.makeItemForWindow();

    // Mark recovered windows
    if(is_ephemeral) {
        //T.treeobj.set_type(node_id, K.NT_RECOVERED);
        T.treeobj.add_multitype(node_id, K.NST_RECOVERED);
    }

    // Update the model
    let new_title;
    if( is_ephemeral && (typeof win_data_v1.raw_title !== 'string') ) {
        new_title = 'Recovered tabs';
    } else if(is_ephemeral) {   // and raw_title is a string
        new_title = String(win_data_v1.raw_title) + ' (Recovered)';
    } else {    // not ephemeral
        let n = win_data_v1.raw_title;
        new_title = (typeof n === 'string') ? n : null;
    }

    val.raw_title = new_title;

    I.refresh_label(node_id);

    addWindowNodeActions(node_id);

    if(win_data_v1.tabs) {
        for(let tab_data_v1 of win_data_v1.tabs) {
            //log.info('   ' + tab_data_v1.text);
            createNodeForClosedTab(tab_data_v1, node_id);
        }
    }

    return node_id;
} //createNodeForClosedWindow

//////////////////////////////////////////////////////////////////////////
// Loading //

/// Did we have a problem loading save data?
var was_loading_error = false;

/// See whether an open Chrome window corresponds to a dormant window in the
/// tree.  This may happen, e.g., due to TabFern refresh or Chrome reload.
/// @param cwin {Chrome Window} the open Chrome window we're checking for
///                             a match.
/// @return {mixed} the existing window's node and value, or false if no match.
function winAlreadyExists(cwin)
{
    WIN:
    for(let existing_win_node_id of T.treeobj.get_node($.jstree.root).children) {

        // Is it already open?  If so, don't hijack it.
        // This also catches non-window nodes such as the holding pen.
        let existing_win_val = D.windows.by_node_id(existing_win_node_id);
        if(!existing_win_val || typeof existing_win_val.isOpen === 'undefined' ||
                existing_win_val.isOpen ) continue WIN;

        // Does it have the same number of tabs?  If not, skip it.
        let existing_win_node = T.treeobj.get_node(existing_win_node_id);
        if(existing_win_node.children.length != cwin.tabs.length)
            continue WIN;

        // Same number of tabs.  Are they the same URLs?
        for(let i=0; i<cwin.tabs.length; ++i) {
            let existing_tab_val = D.tabs.by_node_id(existing_win_node.children[i]);
            if(!existing_tab_val) continue WIN;
            if(existing_tab_val.raw_url !== cwin.tabs[i].url) continue WIN;
        }

        // Since all the tabs have the same URLs, assume we are reopening
        // an existing window.
        return {node: existing_win_node, val: existing_win_val};

    } //foreach existing window

    return false;
} //winAlreadyExists()

/// Add the save data into the tree.
/// Design decision: TabFern SHALL always be able to load older save files.
/// Never remove a loader from this function.
/// @post The new windows are added after any existing windows in the tree
/// @param {mixed} data The save data, parsed (i.e., not a JSON string)
/// @return {number} The number of new windows, or ===false on failure.
///                  ** Note: 0 is a valid number of windows to load!
var loadSavedWindowsFromData = (function(){

    /// Populate the tree from version-0 save data in #data.
    /// V0 format: [win, win, ...]
    /// each win is {text: "foo", tabs: [tab, tab, ...]}
    /// each tab is {text: "foo", url: "bar"}
    function loadSaveDataV0(data)
    {
        let numwins = 0;
        // Make V1 data from the v0 data and pass it along the chain
        for(let v0_win of data) {
            let v1_win = {};
            v1_win.raw_title = v0_win.text;
            v1_win.tabs=[];
            for(let v0_tab of v0_win.tabs) {
                let v1_tab = {raw_title: v0_tab.text, raw_url: v0_tab.url};
                v1_win.tabs.push(v1_tab);
            }
            createNodeForClosedWindow(v1_win);
            ++numwins;
        }
        return numwins;    //load successful
    }  //loadSaveDataV0

    /// Populate the tree from version-1 save data in #data.
    /// V1 format: { ... , tree:[win, win, ...] }
    /// Each win is {raw_title: "foo", tabs: [tab, tab, ...]}
    ///     A V1 win may optionally include:
    ///     - ephemeral:<truthy> (default false) to mark ephemeral windows.
    /// Each tab is {raw_title: "foo", raw_url: "bar"}
    ///     A V1 tab may optionally include:
    ///     - bordered:<truthy> (default false) to mark windows with borders
    function loadSaveDataV1(data) {
        if(!data.tree) return false;
        let numwins=0;
        for(let win_data_v1 of data.tree) {
            createNodeForClosedWindow(win_data_v1);
            ++numwins;
        }
        return numwins;
    }

    /// The mapping table from versions to loaders.
    /// each loader should return truthy if load successful, falsy otherwise.
    let versionLoaders = { 0: loadSaveDataV0, 1: loadSaveDataV1 };

    /// Populate the tree from the save data.
    return function(data)
    {
        let succeeded = false;
        let loader_retval;      // # of wins loaded

        READIT: {
            // Figure out the version number
            let vernum;
            if(Array.isArray(data)) {         // version 0
                vernum = 0;
            } else if( (typeof data === 'object') &&
                    ('tabfern' in data) &&
                    (data['tabfern'] == 42) &&
                    ('version' in data)) {    // a specific version
                vernum = data['version']
            } else {
                log.error('Could not identify the version number of the save data');
                break READIT;
            }

            // Load it
            if(vernum in versionLoaders) {
                loader_retval = versionLoaders[vernum](data);
            } else {
                log.error("I don't know how to load save data from version " + vernum);
                break READIT;
            }

            if(loader_retval === false) {
                log.error("There was a problem loading save data of version " + vernum);
                break READIT;
            }

            succeeded = true;
        }
        return (succeeded ? loader_retval : false);
    }
})(); //loadSavedWindowsFromData

/// Load the saved windows from local storage - used as part of initialization.
/// @param {function} next_action If provided, will be called when loading
///                     is complete.
function loadSavedWindowsIntoTree(next_action) {
    chrome.storage.local.get(K.STORAGE_KEY, function(items) {

        READIT:
        if(typeof(chrome.runtime.lastError) !== 'undefined') {
            //Chrome couldn't load the data
            log.error("Chrome couldn't load save data: " + chrome.runtime.lastError +
                    "\nHowever, if you didn't have any save data, this isn't " +
                    "a problem!");

            // If Chrome didn't load the data, don't treat it as a reading
            // error, since it might simply not have existed.  Therefore,
            // we don't set was_loading_error here.  TODO figure out if
            // this makes sense.  Maybe check the specific error returned.

        } else if(K.STORAGE_KEY in items) {       // Chrome did load the data
            let parsed = items[K.STORAGE_KEY];    // auto JSON.parse
            if(loadSavedWindowsFromData(parsed) === false) {
                was_loading_error = true;
                // HACK - we only use this during init, so
                // set the init-specific variable.
            }
        } else {
            // Brand-new installs seem to fall here: lastError===undefined,
            // but items=={}.  Don't treat this as an error.
            was_loading_error = false;
        }

        // Even if there was an error, call the next action so that
        // the initialization can complete.
        if(typeof next_action !== 'function') return;
        next_action();
    }); //storage.local.get
} //loadSavedWindowsIntoTree

// Debug helper, so uses console.log() directly.
function DBG_printSaveData()
{
    chrome.storage.local.get(K.STORAGE_KEY, function(items) {
        if(typeof(chrome.runtime.lastError) !== 'undefined') {
            console.log(chrome.runtime.lastError);
        } else {
            let parsed = items[K.STORAGE_KEY];
            console.log('Save data:');
            console.log(parsed);
        }
    });
} //DBG_printSaveData()

//////////////////////////////////////////////////////////////////////////
// jstree callbacks //

/// Helper for treeOnSelect() and winOnFocusChanged().
/// chrome.windows.get() callback to flag the current tab in a window
function flagOnlyCurrentTab(win)
{
    let win_node_id = D.windows.by_win_id(win.id, 'node_id');
    let win_node = T.treeobj.get_node(win_node_id);
    if(!win_node) return;

    // Clear the highlights of the tabs
    T.treeobj.flag_node(win_node.children, false);

    // Flag the current tab
    for(let tab of win.tabs) {
        if(tab.active) {
            let tab_node_id = D.tabs.by_tab_id(tab.id, 'node_id');
            if(tab_node_id) T.treeobj.flag_node(tab_node_id);
            break;
        }
    } //foreach tab
} //flagOnlyCurrentTab()

/// ID for a timeout shared by newWinFocusCheckTest() and treeOnSelect()
var awaitSelectTimeoutId = undefined;

/// Process clicks on items in the tree.  Also works for keyboard navigation
/// with arrow keys and Enter.
/// TODO break "open window" out into a separate function.
function treeOnSelect(_evt_unused, evt_data)
{
    //log.info(evt_data.node);
    if(typeof evt_data.node === 'undefined') return;

    // Cancel a timer waiting for selection, if any.
    if(typeof awaitSelectTimeoutId !== 'undefined') {
        window.clearTimeout(awaitSelectTimeoutId);
        awaitSelectTimeoutId = undefined;
    }

    let node = evt_data.node;
    let node_val, is_tab=false, is_win=false;

    let win_id;     // If assigned, this window will be brought to the front
                    // at the end of this function.

    if(node_val = D.tabs.by_node_id(node.id)) {
        is_tab = true;
    } else if(node_val = D.windows.by_node_id(node.id)) {
        is_win = true;
    } else {
        log.error('Selection of unknown node '+node);
        return;     // unknown node type
    }

    // TODO figure out why this doesn't work: T.treeobj.deselect_node(node, true);
    T.treeobj.deselect_all(true);
        // Clear the selection.  True => no event due to this change.
    //log.info('Clearing flags treeonselect');
    //T.treeobj.clear_flags(true);

    // --------
    // Now that the selection is clear, see if this actually should have been
    // an action-button click.  The evt_data.event is not necessarily a
    // click.  For example, it can be a 'select_node' event from jstree.

    if(evt_data.event && evt_data.event.clientX) {
        let e = evt_data.event;
        let elem = document.elementFromPoint(e.clientX, e.clientY);
        if(elem && $(elem).hasClass(K.ACTION_BUTTON_WIN_CLASS)) {
            // The events were such that the user clicked a button but the
            // event went to the wholerow.  I think this is because of how
            // focus/blur happens when you focus a window by clicking on an
            // element in it.  Maybe the mousedown is being
            // lost to the focus change, so the mouseup doesn't trigger a
            // click?  Not sure.
            // Anyway, dispatch the actual action.
            let action = (elem.dataset && elem.dataset.action) ?
                            elem.dataset.action : '** unknown action **';

            log.info({'Actually, button press':elem, action, evt_data});

            switch(action) {
                case 'renameWindow':
                    actionRenameWindow(node.id, node, null, null); break;
                case 'closeWindow':
                    actionCloseWindow(node.id, node, null, null); break;
                case 'deleteWindow':
                    actionDeleteWindow(node.id, node, null, null); break;
                case 'editBullet':
                    actionEditBullet(node.id, node, null, null); break;
                default: break;     //no-op if unknown
            }

            // Whether or not we were able to process the click, it wasn't
            // a selection.  Therefore, don't proceed with the normal
            // on-select operations.
            return;

        } //endif the click was actually an action button
    } //endif event has clientX

    /// Do we need to open a new window?
    let open_new_window = (!node_val.isOpen && (is_tab || is_win) );

    // --------
    // Process the actual node click

    //if(T.treeobj.get_type(node) === K.NT_RECOVERED) {
    if(T.treeobj.has_multitype(node, K.NST_RECOVERED)) {
        //T.treeobj.set_type(node, 'default');
        T.treeobj.del_multitype(node, K.NST_RECOVERED);
    }

    if(is_tab && node_val.isOpen) {   // An open tab
        chrome.tabs.highlight({
            windowId: node_val.win_id,
            tabs: [node_val.index]     // Jump to the clicked-on tab
        }, K.ignore_chrome_error);
        //log.info('flagging treeonselect' + node.id);
        T.treeobj.flag_node(node);
        win_id = node_val.win_id;

    } else if(is_win && node_val.isOpen) {    // An open window
        win_id = node_val.win_id;

    } else if( open_new_window ) {
        // A closed window or tab.  Make sure we have the window.
        let win_node;
        let win_val;

        if(is_win) {    // A closed window
            win_node = node;
            win_val = node_val;

        } else {        // A closed tab - get its window record
            let parent_node_id = node.parent;
            if(!parent_node_id) return;
            let parent_node = T.treeobj.get_node(parent_node_id);
            if(!parent_node) return;

            win_node = parent_node;
            win_val = D.windows.by_node_id(parent_node_id);
            if(!win_val) return;
        }

        // Grab the URLs for all the tabs
        let urls=[];
        let expected_tab_count = win_node.children.length;
        for(let child_id of win_node.children) {
            let child_val = D.tabs.by_node_id(child_id);
            urls.push(child_val.raw_url);
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
                D.windows.change_key(win_val, 'win_id', win.id);

                win_val.isOpen = true;
                win_val.keep = K.WIN_KEEP;      // just in case
                win_val.win = win;
                //T.treeobj.set_type(win_node.id, K.NT_WIN_ELVISH);
                T.treeobj.add_multitype(win_node.id, K.NST_OPEN);

                T.treeobj.open_node(win_node);
                T.treeobj.redraw_node(win_node);
                    // Because open_node() doesn't redraw the parent, only
                    // its children, and opening the node changes the flavor
                    // settings at this time.

                // In Chrome 61, with v0.1.4, I observed strange behaviour:
                // the window would open extra tabs that were copies of
                // items listed in `urls`.  However, win.tabs.length sometimes
                // would, and sometimes would not, indicate those extra tabs.
                // It's a heisenbug.  It may arise from two TabFerns running
                // at once.  It may also be related to what appears to be
                // a Chrome 61 regression - Ctl+N for a new window will
                // sometimes reopen previously-closed tabs. However, I
                // don't know - I can't repro reliably.
                // I have reported the Ctl+N issue:
                // https://bugs.chromium.org/p/chromium/issues/detail?id=762951

                // To hack around this if it happens again, I am trying:

                if(win.tabs.length != expected_tab_count) {
                    log.warn('Win ' + win.id + ': expected ' +
                            expected_tab_count + ' tabs; got ' +
                            win.tabs.length + 'tabs.');
                }
                let count_to_use = Math.min(expected_tab_count, win.tabs.length);
                for(let idx=0; idx < count_to_use; ++idx) {
                    let tab_node_id = win_node.children[idx];
                    let tab_val = D.tabs.by_node_id(tab_node_id);
                    if(!tab_val) continue;

                    let tab = win.tabs[idx];

                    tab_val.win_id = win.id;
                    tab_val.index = idx;
                    tab_val.tab = tab;
                    tab_val.raw_url = tab.url || 'about:blank';
                    tab_val.raw_title = tab.title || '## Unknown title ##';
                    tab_val.isOpen = true;
                    D.tabs.change_key(tab_val, 'tab_id', tab_val.tab.id);
                    T.treeobj.add_multitype(tab_node_id, K.NST_OPEN);
                }

                // Another hack for the strange behaviour above: get rid of
                // any tabs we didn't expect.  This assumes the tabs we
                // wanted come first in the window, which seems to be a safe
                // assumption.
                chrome.windows.get(win.id, {populate: true},
                    function(win) {
                        if(win.tabs.length > expected_tab_count) {
                            log.warn('Win ' + win.id + ': expected ' +
                                    expected_tab_count + ' tabs; got ' +
                                    win.tabs.length + ' tabs --- pruning.');

                            let to_prune=[];
                            for(let tab_idx = expected_tab_count;
                                tab_idx < win.tabs.length;
                                ++tab_idx) {
                                to_prune.push(win.tabs[tab_idx].id);
                            } //foreach extra tab

                            log.warn('Pruning ' + to_prune);
                            chrome.tabs.remove(to_prune, K.ignore_chrome_error);
                        } //endif we have extra tabs

                        // if a tab was clicked on, activate that particular tab
                        if(is_tab) {
                            chrome.tabs.highlight({
                                windowId: node_val.win_id,
                                tabs: [node_val.index]
                            }, K.ignore_chrome_error);
                        }

                        // Set the highlights in the tree appropriately
                        T.treeobj.flag_node(win_node.id);
                        flagOnlyCurrentTab(win);

                    } //get callback
                ); //windows.get

            } //create callback
        ); //windows.created

    } else {    // it's a node type we don't know how to handle.
        log.error('treeOnSelect: Unknown node ' + node);
    }

    // Set highlights for the window, unless we had to open a new window.
    // If we opened a new window, the code above handled this.
    if(!open_new_window && typeof win_id !== 'undefined') {
        unflagAllWindows();

        // Clear the other windows' tabs' flags.
        let node_id = D.windows.by_win_id(win_id, 'node_id');
        //if(node_id) T.treeobj.clear_flags_by_type(K.NTs_TAB, node_id, true);
        if(node_id) T.treeobj.clear_flags_by_multitype(K.NT_TAB, node_id, true);
            // Don't clear flags from children of node_id
            // true => no event

        // Activate the window, if it still exists.
        chrome.windows.get(win_id, function(win) {
            if(typeof(chrome.runtime.lastError) !== 'undefined') return;
            log.debug({'About to activate':win_id});
            chrome.windows.update(win_id,{focused:true}, K.ignore_chrome_error);
            // winOnFocusedChange will set the flag on the newly-focused window
        });
    }
} //treeOnSelect

///// Callback for flavors.
///// @param this {jstree Node} The node
///// @param flavors {array} the flavors
///// @param elem {DOM Element} the <li>
//function flavor_callback(flavors, elem)
//{
//    // Apply borders to bordered tabs
//    if(this.type === K.NT_TAB && flavors.indexOf(K.NF_BORDERED) !== -1)
//        return {'class': K.BORDERED_TAB_CLASS};
//
//    if(this.type === K.NT_WIN_ELVISH) return {'class': 'green'};
//    else if(this.type === K.NT_TAB) return {'class': 'blue'};
//    else return {'class': 'red'};
//} //flavor_callback

//////////////////////////////////////////////////////////////////////////
// Chrome window/tab callbacks //

function winOnCreated(win)
{
    log.info({'Window created': win.id,
                "Restore?": (window_is_being_restored ? "yes" : "no"),
                win
            });
    //log.info('clearing flags winoncreated');

    T.treeobj.clear_flags();
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

    createNodeForWindow(win, K.WIN_NOKEEP);
    T.vscroll_function();
    saveTree();     // for now, brute-force save on any change.
} //winOnCreated

/// Update the tree when the user closes a browser window
function winOnRemoved(win_id)
{
    if(win_id == my_winid) return;  // does this happen?

    log.info({'Window removed': win_id});

    // Stash the size of the window being closed as the size for
    // reopened windows.
    if(win_id in winSizes) {
        // TODO only do this is win_id's type is "normal"
        newWinSize = winSizes[win_id];
        delete winSizes[win_id];
    }

    let node_val = D.windows.by_win_id(win_id);
    if(!node_val) return;   // e.g., already closed
    let node_id = node_val.node_id;
    if(!node_id) return;
    let node = T.treeobj.get_node(node_id);
    if(!node) return;

    log.debug({'Node for window being removed':node});

    // Keep the window record in place if it is saved and still has children.
    // If it's not saved, toss it.
    // If it is saved, but no longer has any children, toss it.  This can
    // happen, e.g., when dragging the last tab(s) in the Chrome window to
    // attach them to another window.
    if(node_val.keep === K.WIN_KEEP &&
            node.children && node.children.length > 0
    ) {
        node_val.isOpen = false;   // because it's already gone
        if(node_val.win) actionCloseWindow(node_id, node, null, null);
            // Since it was saved, leave it saved.  You can only get rid
            // of saved sessions by X-ing them expressly (actionDeleteWindow).
            // if(node_val.win) because a window closed via actionCloseWindow
            // or actionDeleteWindow will have a falsy node_val.win, so we
            // don't need to call those functions again.
        saveTree();     // TODO figure out if we need this.
    } else {
        // Not saved - just toss it.
        actionDeleteWindow(node_id, node, null, null);
            // This removes the node's children also.
            // actionDeleteWindow also saves the tree, so we don't need to.
    }
    T.vscroll_function();
} //winOnRemoved

/// Update the highlight for the current window.  Note: this does not always
/// seem to fire when switching to a non-Chrome window.
/// See https://stackoverflow.com/q/24307465/2877364 - onFocusChanged
/// is known to be a bit flaky.
///
/// @param win_id {number} the ID of the newly-focused window
/// @param internal {boolean} if truthy, this was called as a helper, e.g., by
///                 tabOnActivated or tabOnDeactivated.  Therefore, it has work
///                 to do even if the window hasn't changed.
var winOnFocusChanged;

/// Initialize winOnFocusChanged.  This is a separate function since it
/// cannot be called until jQuery has been loaded.
function initFocusHandler()
{
    /// The type of window focus is changing from
    const [FC_FROM_TF, FC_FROM_NONE, FC_FROM_OPEN] = ['from_tf','from_none','from_open'];
    /// The type of window focus is changing to
    const [FC_TO_TF, FC_TO_NONE, FC_TO_OPEN] = ['to_tf','to_none','to_open'];

    /// Sugar
    const WINID_NONE = chrome.windows.WINDOW_ID_NONE;

    /// The previously-focused window
    let previously_focused_winid = WINID_NONE;

    /// clientX, Y while focus was elsewhere
    var x_blurred = undefined, y_blurred = undefined;

    /// Set up event listeners for DOM onfocus/onblur
    $(function(){

        /// Track the coordinates while the mouse is moving over the
        /// non-focused TabFern window.
        /// Mousedown doesn't help since it fires after the focus event.
        function onmousemove(evt) {
            x_blurred = evt.clientX;
            y_blurred = evt.clientY;
            //log.info({x_blurred,y_blurred});
        }

        /// Focus event handler.  Empirically, this happens after the
        /// chrome.windows.onFocusChanged event.
        $(window).focus(function(evt){
            log.debug({onfocus:evt, x_blurred,y_blurred,
                elts: document.elementsFromPoint(x_blurred,y_blurred)
            });
            $(window).off('mousemove.tabfern');
            x_blurred = undefined;  // can't leave them sitting around,
            y_blurred = undefined;  // lest we risk severe confusion.
        });

        $(window).blur(function(evt){
            //log.debug({onblur:evt});
            $(window).on('mousemove.tabfern', onmousemove);
                // Track pointer position while the window is blurred so we
                // can take a reasonable guess, in the onFocusChanged handler,
                // what element was clicked.
        });
    }); //end listener setup

    /// Helper for cleaning up flags on the window we're leaving.
    /// Clear the flags on #old_win_id and its tabs.
    function leavingWindow(old_win_id)
    {
        let old_node_id = D.windows.by_win_id(old_win_id, 'node_id');
        if(!old_node_id) return;

        T.treeobj.flag_node(old_node_id, false);

        let old_node = T.treeobj.get_node(old_node_id);
        if(!old_node) return;
        T.treeobj.flag_node(old_node.children, false);
    } //leavingWindow

    /// The actual onFocusChanged event handler
    function inner(win_id, _unused_internal)
    {
        let old_win_id = previously_focused_winid;

        // What kind of change is it?
        let change_from, change_to;
        if(win_id === my_winid) change_to = FC_TO_TF;
        else if(win_id === WINID_NONE) change_to = FC_TO_NONE;
        else change_to = FC_TO_OPEN;

        if(old_win_id === my_winid) change_from = FC_FROM_TF;
        else if(old_win_id === WINID_NONE) change_from = FC_FROM_NONE;
        else change_from = FC_FROM_OPEN;

        log.info({change_from, old_win_id, change_to, win_id});

        let same_window = (old_win_id === win_id);
        previously_focused_winid = win_id;

        // --- Handle the changes ---

        if(change_to === FC_TO_OPEN) {
            let win_val = D.windows.by_win_id(win_id);
            if(!win_val) return;
            let win_node = T.treeobj.get_node(win_val.node_id);
            if(!win_node) return;

            NEWWIN: if(!same_window) {
                leavingWindow(old_win_id);

                // Flag the newly-focused window
                T.treeobj.flag_node(win_node.id);
            }

            // Flag the current tab within the new window
            chrome.windows.get(win_id, {populate:true}, flagOnlyCurrentTab);
        } //endif to_open

        else if(change_to === FC_TO_NONE) {
            unflagAllWindows();
            // leave tab flags alone so you can see by looking at the TabFern
            // window which tab you have on top.
        }

        else if(change_to === FC_TO_TF) {
            if(typeof x_blurred !== 'undefined') {
                // We can guess where the click was
                let elts = document.elementsFromPoint(x_blurred,y_blurred);
                if( elts && elts.length &&
                    elts.includes(document.getElementById('maintree'))
                ) {     // A click on the tree.  Guess that there may be
                        // an action coming.
                    log.debug({"Awaiting select":1,elts});
                    awaitSelectTimeoutId = window.setTimeout(
                                function(){leavingWindow(old_win_id);},
                                100
                    );
                    // If treeOnSelect() happens before the timeout,
                    // the timeout will be cancelled.  Otherwise, the
                    // flags will be cleared.  This should reduce
                    // flicker in the TabFern window, because treeOnSelect
                    // can do the flag changes instead of this.
                } else {    // A click somewhere other than the tree
                    unflagAllWindows();
                }

            } else {
                // We do not know where the click was (e.g., Alt-Tab out/in)
                unflagAllWindows();
                // leave tab flags alone
            }
        } //endif to_tf

    }; //inner

    winOnFocusChanged = inner;

} //initFocusHandler

/// Process creation of a tab.  NOTE: in Chrome 60.0.3112.101, we sometimes
/// get two consecutive tabs.onCreated events for the same tab.  Therefore,
/// we check for that here.
function tabOnCreated(tab)
{
    log.info({'Tab created': tab.id, tab});

    let win_node_id = D.windows.by_win_id(tab.windowId, 'node_id')
    if(!win_node_id) return;

    let tab_node_id;

    // See if this is a duplicate of an existing tab
    let tab_val = D.tabs.by_tab_id(tab.id);
    let check_existing = false;

    if(tab_val === undefined) {     // If not, create the tab
        let tab_node_id = createNodeForTab(tab, win_node_id);   // Adds at end
        T.treeobj.because('chrome','move_node',tab_node_id, win_node_id, tab.index);
            // Put it in the right place
        tab_val = D.tabs.by_tab_id(tab.id);
        check_existing = true;
    } else {
        log.info('   - That tab already exists.');
        T.treeobj.because('chrome', 'move_node', tab_val.node_id, win_node_id, tab.index);
            // Just put it where it now belongs.
    }

    updateTabIndexValues(win_node_id);      // This leaves us in a consistent state.

    // Check if we now match a saved window.  If so, merge the two.

    T.vscroll_function();

    check_existing = false;     // DEBUG - remove this when the code below is filled in
    if(!check_existing) {
        saveTree();
    } else {
        saveTree(true, function(_unused_err, _unused_dat) {
            let existing_win = winAlreadyExists(win);
            if(existing_win) {
                actionDeleteWindow(win_node_id, T.treeobj.get_node(win_node_id),null,null);
            } //endif existing
        });
    }
} //tabOnCreated

function tabOnUpdated(tabid, changeinfo, tab)
{
    log.info({'Tab updated': tabid, changeinfo, tab});

    let tab_node_val = D.tabs.by_tab_id(tabid);
    if(!tab_node_val) return;
    let tab_node_id = tab_node_val.node_id;

    let node = T.treeobj.get_node(tab_node_id);
    tab_node_val.isOpen = true;     //lest there be any doubt
    tab_node_val.raw_url = changeinfo.url || tab.url || 'about:blank';

    // Set the name
    if(changeinfo.title) {
        tab_node_val.raw_title = changeinfo.title;
    } else if(tab.title) {
        tab_node_val.raw_title = tab.title;
    } else {
        tab_node_val.raw_title = 'Tab';
    }
    I.refresh_label(tab_node_id);

    {   // set the icon
        let icon_text;
        if(changeinfo.favIconUrl) {
            icon_text = encodeURI(changeinfo.favIconUrl);
        } else if(tab.favIconUrl) {
            icon_text = encodeURI(tab.favIconUrl);
        } else if((/\.pdf$/i).test(tab_node_val.raw_url)) {
            // Special case for PDFs because I use them a lot.
            // Not using the Silk page_white_acrobat icon.
            icon_text = 'fff-page-white-with-red-banner';
        } else {
            icon_text = 'fff-page';
        }
        T.treeobj.set_icon(tab_node_id, icon_text);
    }

    saveTree();

    // For some reason, Ctl+N plus filling in a tab doesn't give me a
    // focus change to the new window.  Therefore, if the tab that has
    // changed is in the active window, update the flags for
    // that window.
    chrome.windows.getLastFocused(function(win){
        if(typeof(chrome.runtime.lastError) === 'undefined') {
            if(tab.windowId === win.id) {
                winOnFocusChanged(win.id, true);
            }
        }
    });
} //tabOnUpdated

/// Handle movements of tabs or tab groups within a window.
function tabOnMoved(tabid, moveinfo)
{
    log.info({'Tab moved': tabid, moveinfo});

    let from_idx = moveinfo.fromIndex;
    let to_idx = moveinfo.toIndex;

    // Get the parent (window)
    let window_node_id = D.windows.by_win_id(moveinfo.windowId, 'node_id');
    if(!window_node_id) return;

    // Get the tab's node
    let tab_node_id = D.tabs.by_tab_id(tabid, 'node_id');
    if(!tab_node_id) return;

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

    T.treeobj.because('chrome','move_node', tab_node_id, window_node_id, jstree_new_index);

    // Update the indices of all the tabs in this window.  This will update
    // the old tab and the new tab.
    updateTabIndexValues(window_node_id);

    saveTree();
} //tabOnMoved

function tabOnActivated(activeinfo)
{
    log.info({'Tab activated': activeinfo.tabId, activeinfo});

    winOnFocusChanged(activeinfo.windowId, true);

    return; // winOnFocusChanged handles the tab flagging as well
//    // Highlight the active tab
//    SELTAB: {
//        // Get the tab's node
//        let tab_node_id = D.tabs.by_tab_id(activeinfo.tabId, 'node_id');
//        if(!tab_node_id) break SELTAB;
//
//        //log.info('Clearing flags tabonactivate');
//        T.treeobj.clear_flags();
//        //log.info('flagging ' +tab_node_id);
//        T.treeobj.flag_node(tab_node_id);
//    }

    // No need to save --- we don't save which tab is active.
} //tabOnActivated

/// Delete a tab's information when the user closes it.
function tabOnRemoved(tabid, removeinfo)
{
    log.info({'Tab removed': tabid, removeinfo});

    // If the window is closing, do not remove the tab records.
    // The cleanup will be handled by winOnRemoved().
    if(removeinfo.isWindowClosing) return;

    let window_node_id = D.windows.by_win_id(removeinfo.windowId, 'node_id');
    if(!window_node_id) return;

    {   // Keep the locals here out of the scope of the closure below.
        // Get the parent (window)
        let window_node = T.treeobj.get_node(window_node_id);
        if(!window_node) return;

        // Get the tab's node
        let tab_node_id = D.tabs.by_tab_id(tabid, 'node_id');
        if(!tab_node_id) return;
        let tab_node = T.treeobj.get_node(tab_node_id);
        if(!tab_node) return;

        // Remove the node
        let tab_val = D.tabs.by_tab_id(tabid);

        // See if it's a tab we have already marked as removed.  If so,
        // whichever code marked it is responsible, and we're off the hook.
        if(!tab_val || !tab_val.tab_id) return;

        D.tabs.remove_value(tab_val);
            // So any events that are triggered won't try to look for a
            // nonexistent tab.
        T.treeobj.because('chrome','delete_node',tab_node);
    }

    // Refresh the tab.index values for the remaining tabs
    updateTabIndexValues(window_node_id);

    T.vscroll_function();
    saveTree();
} //tabOnRemoved

/// When tabs detach, move them to the holding pen.
function tabOnDetached(tabid, detachinfo)
{
    // Don't save here?  Do we get a WindowCreated if the tab is not
    // attached to another window?
    log.info({'Tab detached': tabid, detachinfo});

    T.treeobj.clear_flags();  //just to be on the safe side

    let tab_val = D.tabs.by_tab_id(tabid);

    if(!tab_val)    // An express failure message - this would be bad
        throw new Error("Unknown tab to detach???? "+tabid+' '+detachinfo.toString());

    let old_win_val = D.windows.by_win_id(detachinfo.oldWindowId);
    if(!old_win_val)    // ditto
        throw new Error("Unknown window detaching from???? "+attachinfo.newWindowId+' '+attachinfo.toString());

    T.treeobj.because('chrome','move_node', tab_val.node_id, T.holding_node_id);
    tab_val.win_id = K.NONE;
    tab_val.index = K.NONE;

    updateTabIndexValues(old_win_val.node_id);

} //tabOnDetached

/// When tabs attach, move them out of the holding pen.
function tabOnAttached(tabid, attachinfo)
{
    log.info({'Tab attached': tabid, attachinfo});

    let tab_val = D.tabs.by_tab_id(tabid);

    if(!tab_val)        // An express failure message - this would be bad
        throw new Error("Unknown tab to attach???? "+tabid+' '+attachinfo.toString());

    let new_win_val = D.windows.by_win_id(attachinfo.newWindowId);
    if(!new_win_val)    // ditto
        throw new Error("Unknown window attaching to???? "+attachinfo.newWindowId+' '+attachinfo.toString());

    T.treeobj.because('chrome','move_node', tab_val.node_id, new_win_val.node_id,
            attachinfo.newPosition);

    tab_val.win_id = attachinfo.newWindowId;
    tab_val.index = attachinfo.newPosition;

    updateTabIndexValues(new_win_val.node_id);
} //tabOnAttached

function tabOnReplaced(addedTabId, removedTabId)
{
    // Do we get this?
    log.warn('Tab being replaced: added ' + addedTabId + '; removed ' +
                removedTabId);
} //tabOnReplaced

//////////////////////////////////////////////////////////////////////////
// DOM event handlers //

/// ID of a timer to save the new window size after a resize event
var resize_save_timer_id;

/// A cache of the last size we saved to disk
var last_saved_size;

/// Save #size_data as the size of our popup window
function saveViewSize(size_data)
{
    //log.info('Saving new size ' + size_data.toString());

    let to_save = {};
    to_save[K.LOCN_KEY] = size_data;
    chrome.storage.local.set(to_save,
            function() {
                let err = chrome.runtime.lastError;
                if(typeof(err) === 'undefined') {
                    last_saved_size = $.extend({}, size_data);
                    log.info('Saved size');
                } else {
                    log.error("TabFern: couldn't save location: " + err);
                }
            });
} //saveViewSize()

/// When the user resizes the tabfern popup, save the size for next time.
function eventOnResize(evt)
{
    // Clear any previous timer we may have had running
    if(resize_save_timer_id) {
        window.clearTimeout(resize_save_timer_id);
        resize_save_timer_id = undefined;
    }

    let size_data = getWindowSize(window);

    // Save the size, but only after two seconds go by.  This is to avoid
    // saving until the user is actually done resizing.
    resize_save_timer_id = window.setTimeout(
            ()=>{saveViewSize(size_data);}, 2000);

} //eventOnResize

// On a timer, save the window size if it has changed.  Inspired by, but not
// copied from, https://stackoverflow.com/q/4319487/2877364 by
// https://stackoverflow.com/users/144833/oscar-godson
function timedResizeDetector()
{
    let size_data = getWindowSize(window);
    if(!ObjectCompare(size_data, last_saved_size)) {
        saveViewSize(size_data);
    }
    setTimeout(timedResizeDetector, K.RESIZE_DETECTOR_INTERVAL_MS);
} //timedResizeDetector

//////////////////////////////////////////////////////////////////////////
// Hamburger menu //

/// Open a new window with the TabFern homepage.
function hamAboutWindow()
{
    K.openWindowForURL('https://cxw42.github.io/TabFern/');
} //hamAboutWindow()

/// Open the Settings window.  If ShowWhatIsNew, also updates the K.LASTVER_KEY
/// information used by checkWhatIsNew().
function hamSettings()
{
    // Actually open the window
    K.openWindowForURL(chrome.extension.getURL(
        '/src/options_custom/index.html' +
        (ShowWhatIsNew ? '#open=last' : ''))
    );

    // Record that the user has seen the "what's new" for this version
    if(ShowWhatIsNew) {
        ShowWhatIsNew = false;

        let to_save = {};
        to_save[K.LASTVER_KEY] = TABFERN_VERSION;
        chrome.storage.local.set(to_save, K.ignore_chrome_error);
    }
} //hamSettings()

function hamBackup()
{
    let date_tag = new Date().toISOString().replace(/:/g,'.');
        // DOS filenames can't include colons.
        // TODO use local time - maybe
        // https://www.npmjs.com/package/dateformat ?
    let filename = 'TabFern backup ' + date_tag + '.tabfern';

    // Save the tree, including currently-open windows/tabs, then
    // export the save data to #filename.
    saveTree(true, function(_unused_err, saved_info){
        Modules.exporter(document, JSON.stringify(saved_info), filename);
    });
} //hamBackup()

/// Restore tabs from a saved backup.  Note that this adds the tabs to those
/// already present.  It does not delete existing tabs/windows.
function hamRestoreFromBackup()
{
    let importer = new Modules.importer(document, '.tabfern');
    importer.getFileAsString(function(text, filename){
        try {
            let parsed = JSON.parse(text);
            if(loadSavedWindowsFromData(parsed) === false) {
                window.alert("I couldn't load the file " + filename + ': ' + e);
            }
        } catch(e) {
            window.alert("File " + filename + ' is not something I can '+
                'understand as a TabFern save file.  Parse error code was: ' +
                e);
        }
    });
} //hamRestoreFromBackup()

function hamRestoreLastDeleted()
{
    if(!Array.isArray(lastDeletedWindow) || lastDeletedWindow.length<=0) return;

    // Make v0 save data from the last-deleted-window URLs, just because
    // v0 is convenient, and the backward-compatibility guarantee of
    // loadSavedWindowsFromData means we won't have to refactor this.
    let tabs=[]
    for(let url of lastDeletedWindow) {
        tabs.push({text: 'Restored', url: url});
    }
    let dat = [{text: 'Restored window', tabs: tabs}];

    // Load it into the tree
    let wins_loaded = loadSavedWindowsFromData(dat);
    if(typeof wins_loaded === 'number' && wins_loaded > 0) {
        // We loaded the window successfully.  Open it, if the user wishes.
        if(getBoolSetting(CFG_RESTORE_ON_LAST_DELETED, false)) {
            let root = T.treeobj.get_node($.jstree.root);
            let node_id = root.children[root.children.length-1];
            T.treeobj.select_node(node_id);
        }
    }

    lastDeletedWindow = [];
} //hamRestoreLastDeleted

function hamExpandAll()
{
    T.treeobj.open_all();
} //hamExpandAll()

function hamCollapseAll()
{
    T.treeobj.close_all();
} //hamCollapseAll()

/// Make a function to sort the top-level nodes based on #compare_fn
function hamSorter(compare_fn)
{
    return function() {
        T.treeobj.get_node($.jstree.root).children.sort(compare_fn);
            // children[] holds node IDs, so compare_fn will always get strings.
        T.treeobj.redraw(true);   // true => full redraw
    };
} //hamSorter

function hamRunJasmineTests()
{
    K.openWindowForURL(chrome.extension.getURL('/test/index.html'));
} // hamRunJasmineTests

function hamSortOpenToTop()
{
    hamSorter(Modules['view/sorts'].open_windows_to_top)();     //do the sort

    if(getBoolSetting(CFG_JUMP_WITH_SORT_OPEN_TOP, true)) {
        let h = $('html');
        if(h.scrollTop != 0) h.animate({scrollTop:0});
            // https://stackoverflow.com/a/3442125/2877364 by
            // https://stackoverflow.com/users/415290/todd
    }
}
/**
 * You can call proxyfunc with the items or just return them, so we just
 * return them.
 *
 * Note: Only use String, non-Integer, non-Symbol keys in the returned items.
 * That way the context menu will be in the same order as the order of the keys
 * in the items.  See https://stackoverflow.com/a/32149345/2877364 and
 * http://www.ecma-international.org/ecma-262/6.0/#sec-ordinary-object-internal-methods-and-internal-slots-ownpropertykeys
 * for details.
 *
 * @param node
 * @returns {actionItemId: {label: string, action: function}, ...}, or
 *          false for no menu.
 */

function getHamburgerMenuItems(node, _unused_proxyfunc, e)
{
    let items = {};

    // Add development-specific items, if any
    if(is_devel_mode) {
        items.splitItem = {
            label: 'Split test',
            action: function(){
                if(window.parent && window.parent.doSplit)
                    window.parent.doSplit();
            },
        };

        items.jasmineItem = {
            label: 'Run Jasmine tests',
            action: hamRunJasmineTests,
            icon: 'fa fa-fort-awesome',
            separator_after: true,
        };
    } //endif is_devel_mode

    items.infoItem = {
            label: "Online info",
            title: "The TabFern web site, with a basic usage guide and the credits",
            action: hamAboutWindow,
            icon: 'fa fa-info',
        };
    items.settingsItem = {
            label: "Settings and offline help",
            title: "Also lists the features introduced with each version!",
            action: hamSettings,
            icon: 'fa fa-cog' + (ShowWhatIsNew ? ' tf-notification' : ''),
                // If we have a "What's new" item, flag it
            separator_after: true
        };

    if(Array.isArray(lastDeletedWindow) && lastDeletedWindow.length>0) {
        items.restoreLastDeletedItem = {
            label: "Restore last deleted",
            action: hamRestoreLastDeleted,
        };
    }

    items.backupItem = {
            label: "Backup now",
            icon: 'fa fa-floppy-o',
            action: hamBackup,
        };
    items.restoreItem = {
            label: "Load contents of a backup",
            action: hamRestoreFromBackup,
            icon: 'fa fa-folder-open-o',
            separator_after: true,
        };

    items.sortItem = {
            label: 'Sort',
            icon: 'fa fa-sort',
            submenu: {
                openToTopItem: {
                    label: 'Open windows to top',
                    title: 'Sort ascending by window name, case-insensitive, '+
                            'and put the open windows at the top of the list.',
                    action: hamSortOpenToTop,
                    icon: 'fff-text-padding-top'
                },
                azItem: {
                    label: 'A-Z',
                    title: 'Sort ascending by window name, case-insensitive',
                    action: hamSorter(Modules['view/sorts'].compare_node_text),
                    icon: 'fa fa-sort-alpha-asc',
                },
                zaItem: {
                    label: 'Z-A',
                    title: 'Sort descending by window name, case-insensitive',
                    action: hamSorter(Modules['view/sorts'].compare_node_text_desc),
                    icon: 'fa fa-sort-alpha-desc',
                },
                numItem09: {
                    label: '0-9',
                    title: 'Sort ascending by window name, numeric, case-insensitive',
                    action: hamSorter(Modules['view/sorts'].compare_node_num),
                    icon: 'fa fa-sort-numeric-asc',
                },
                // Test of sub-submenus --- jstree doesn't seem to correctly
                // constrain them to the viewport.
                //test: { label: 'test', submenu:
                //  { foo: {label:'foo'},bar:{label:'bar'},bat:{label:'bat'}}},
                numItem90: {
                    label: '9-0',
                    title: 'Sort descending by window name, numeric, case-insensitive',
                    action: hamSorter(Modules['view/sorts'].compare_node_num_desc),
                    icon: 'fa fa-sort-numeric-desc',
                },
            } //submenu
        }; //sortItem

    items.expandItem = {
            label: "Expand all",
            icon: 'fa fa-plus-square',
            action: hamExpandAll,
        };
    items.collapseItem = {
            label: "Collapse all",
            icon: 'fa fa-minus-square',
            action: hamCollapseAll,
        };

    return items;
} //getHamburgerMenuItems()

//////////////////////////////////////////////////////////////////////////
// Context menu for the main tree

function getMainContextMenuItems(node, _unused_proxyfunc, e)
{

    // TODO move this to Bypasser.isBypassed(e)
    if ( Bypasser.isBypassed() ) {
        return false;
    } else {    // not bypassed - show jsTree context menu
        e.preventDefault();
    }

    // What kind of node is it?
    let nodeType, win_val, tab_val;
    {
        win_val = D.windows.by_node_id(node.id);
        if(win_val) nodeType = K.IT_WINDOW;
    }

    if(!nodeType) {
        tab_val = D.tabs.by_node_id(node.id);
        if(tab_val) nodeType = K.IT_TAB;
    }

    if(!nodeType) return false;     // A node type we don't know about

    // -------

    if(nodeType === K.IT_TAB) {
        let tabItems = {
            toggleBorderItem: {
                label: 'Toggle top border',
                action: function(){actionToggleTabTopBorder(node.id, node, null, null)}
            },
            editBulletItem: {
                label: 'Add/edit a note',
                icon: 'fff-pencil',

                // Use K.nextTickRunner so the context menu can be
                // hidden before actionRenameWindow() calls window.prompt().
                action: K.nextTickRunner(
                    function(){actionEditBullet(node.id, node, null, null);}
                )
            },
        };

        return tabItems;
    }

    if(nodeType === K.IT_WINDOW) {
        let winItems = {};

        winItems.renameItem = {
                label: 'Rename',
                icon: 'fff-pencil',

                // Use K.nextTickRunner so the context menu can be
                // hidden before actionRenameWindow() calls window.prompt().
                action: K.nextTickRunner(
                    function(){actionRenameWindow(node.id, node, null, null);}
                )
            };

        // Forget/Remember
        if( win_val.isOpen && (win_val.keep === K.WIN_KEEP) ) {
            winItems.forgetItem = {
                label: "Forget but don't close",
                title: "Do not save this window when it is closed",
                icon: 'fa fa-chain-broken',
                action:
                    function(){actionForgetWindow(node.id, node, null, null);}
            };
        } else if( win_val.isOpen && (win_val.keep === K.WIN_NOKEEP) ) {
            winItems.rememberItem = {
                label: "Remember",
                title: "Save this window when it is closed",
                icon: 'fa fa-link',
                action:
                    function(){actionRememberWindow(node.id, node, null, null);}
            };
        }

        if(win_val.isOpen) {
            winItems.closeItem = {
                    label: 'Close and remember',
                    icon: 'fff-picture-delete',
                    action:
                        function(){actionCloseWindow(node.id,node,null,null);}
                };
        }

        winItems.deleteItem = {
                label: 'Delete',
                icon: 'fff-cross',
                separator_before: true,
                action:
                    function(){actionDeleteWindow(node.id, node, null, null);}
            };

        return winItems;
    } //endif K.IT_WINDOW

    return false;   // if it's a node we don't have a menu for

//    // Note: Don't return {} --- that seems to cause jstree to not properly
//    // remove the jstree-context style.  Instead, something like this:
//    return Object.keys(items).length > 0 ? items : false ;
//        // https://stackoverflow.com/a/4889658/2877364 by
//        // https://stackoverflow.com/users/7012/avi-flax

} //getMainContextMenuItems

//////////////////////////////////////////////////////////////////////////
// Drag-and-drop support //

/// Determine whether a node or set of nodes can be dragged.
/// @param {array} nodes The full jstree node record(s) being dragged
/// @return {boolean} Whether or not the node is draggable
function dndIsDraggable(nodes, evt)
{
    if(log.getLevel() <= log.levels.TRACE) {
        console.group('is draggable?');
        console.log(nodes);
        //console.log($.jstree.reference(evt.target));
        console.groupEnd();
    }

    return true;        // For now, any node is draggable.
} //dndIsDraggable

/// Determine whether a node is a valid drop target.
/// This function actually gets called for all changes to the tree,
/// so we permit everything except for invalid drops.
/// @param operation {string}
/// @param node {Object} The full jstree node record of the node that might
///                      be affected
/// @param new_parent {Object} The full jstree node record of the
///                             node to be the parent
/// @param more {mixed} optional object of additional data.
/// @return {boolean} whether or not the operation is permitted
///
var treeCheckCallback = (function(){

    /// The move_node callback we will use to remove empty windows
    /// when dragging the last tab out of a window
    function remove_empty_window(evt, data)
    {   // Note: data.old_parent is the node ID of the former parent
        if(log.getLevel() <= log.levels.TRACE) {
            console.group('remove_empty_window');
            console.log(evt);
            console.log(data);
            console.groupEnd();
        }

        // Don't know if we need to delay until the next tick, but I'm going
        // to just to be on the safe side.  This will give T.treeobj.move_node
        // a chance to finish.
        ASQ().val(()=>{ T.treeobj.delete_node(data.old_parent); });
    } //remove_empty_window

    /// Move a tab within its Chrome window, or from an open window to a
    /// closed window.
    function move_open_tab_in_window(evt, data)
    {
        // Which tab we're moving
        let val = D.tabs.by_node_id(data.node.id);
        if( !val || val.tab_id === K.NONE ) return;

        // Which window we're moving it to
        let parent_val = D.windows.by_node_id(data.parent);
        if(!parent_val) return;

        if(parent_val.isOpen) {
            if( parent_val.win_id === K.NONE) return;
            // Move an open tab from one open window to another.
            // Chrome fires a tabOnMoved after we do this, so we
            // don't have to update the tree here.
            // As above, delay to be on the safe side.
            ASQ().val(()=>{
                chrome.tabs.move(val.tab_id,
                    {windowId: parent_val.win_id, index: data.position}
                    , K.ignore_chrome_error);
            });

        } else {
            // Move an open tab to a closed window

            let old_parent_val = D.windows.by_node_id(data.old_parent);
            let old_parent_node = T.treeobj.get_node(data.old_parent);
            if( !old_parent_val || old_parent_val.win_id === K.NONE ||
                !old_parent_node ) return;

            // As above, delay to be on the safe side.
            let seq = ASQ();
            let tab_id = val.tab_id;

            // Disconnect the tab first, so tabOnRemoved() doesn't
            // delete it after the chrome.tabs.remove() call.
            seq.val(()=>{
                D.tabs.change_key(val, 'tab_id', K.NONE);
                val.tab = undefined;
                val.win_id = K.NONE;
                val.index = K.NONE;
                val.isOpen = false;
                T.treeobj.del_multitype(val.node_id, K.NST_OPEN);
            });

            // Now that it's disconnected, close the actual tab
            seq['try']((done)=>{
                chrome.tabs.remove(tab_id, CC(done));
                // if tab_id was the last tab in old_parent, winOnRemoved
                // will delete the tree node.  Therefore, we do not have
                // to do so.
            });

            // Whether or not the removal succeeded, update the tab indices
            // on both windows for safety.
            seq.val((result_unused)=>{
                updateTabIndexValues(data.parent);
                updateTabIndexValues(data.old_parent);
            });

        } //endif open parent window else

    } //move_open_tab_in_window

    // --- The main check callback ---
    function inner(operation, node, new_parent, node_position, more)
    {
        // Fast bail when possible
        if(operation === 'copy_node') return false; // we can't handle copies at present
        if(operation !== 'move_node') return true;

        // Don't log checks during initial tree population
        if(did_init_complete && (log.getLevel() <= log.levels.TRACE) ) {
            console.group('check callback for ' + operation);
            console.log(node);
            console.log(new_parent);
            //console.log(node_position);
            if(more) console.log(more);
            if(!more || !more.dnd) {
                console.group('Not drag and drop');
                console.trace();
                console.groupEnd();
            }
            console.groupEnd();
        } //logging

        let tyval = I.get_node_tyval(node.id);
        if(!tyval) return false;    // sanity check

        let new_parent_tyval;
        if(new_parent.id !== $.jstree.root) {
            new_parent_tyval = I.get_node_tyval(new_parent.id);
        }

        // The "can I drop here?" check.
        if(more && more.dnd && operation==='move_node') {

            node_being_dragged = node.id;

            if(tyval.ty === K.IT_WINDOW) {              // Dragging windows
                // Can't drop inside another window - only before or after
                if(more.pos==='i') return false;

                // Can't drop other than in the root
                if(new_parent.id !== $.jstree.root) return false;

            } else if(tyval.ty === K.IT_TAB) {          // Dragging tabs
                // Tabs: Can drop closed tabs in closed windows, or open
                // tabs in open windows.  Can also drop open tabs to closed
                // windows, in which case the tab is closed.
                // TODO revisit this when we later
                // permit opening tab-by-tab (#35).


                if(tyval.val.isOpen) {      // open tab
                    if( !new_parent_tyval || //!new_parent_tyval.val.isOpen ||
                        new_parent_tyval.ty !== K.IT_WINDOW
                    ) {
                        return false;
                    }

                } else {                    // closed tab
                    if( !new_parent_tyval || new_parent_tyval.val.isOpen ||
                        new_parent_tyval.ty !== K.IT_WINDOW
                    ) {
                        return false;
                    }
                }
            } //endif tab

            if(log.getLevel()<=log.levels.TRACE) console.log('OK to drop here');

        } //endif move_node checks

        // The "I'm about to move it here --- OK?" check.  This happens for
        // drag and also for express calls to move_node.
        if(operation==='move_node') {

            if(log.getLevel() <= log.levels.TRACE) {
                console.group('check callback for node move');
                console.log(tyval);
                console.log(node);
                console.log(new_parent);
                if(more) console.log(more);
                console.groupEnd();
            }

            // Windows: can only drop in root
            if(tyval.ty === K.IT_WINDOW) {
                if(new_parent.id !== $.jstree.root) return false;

            } else if(tyval.ty === K.IT_TAB) {
                let curr_parent_id = node.parent;
                let new_parent_id = new_parent.id;

                if(tyval.val.isOpen) {

                    // Can move open tabs between open windows or the
                    // holding pen.  Also, can move open tabs to closed
                    // windows.
                    if( curr_parent_id !== T.holding_node_id &&
                        new_parent_id !== T.holding_node_id &&
                        (!new_parent_tyval) ) // || !new_parent_tyval.val.isOpen) )
                        return false;

                } else {
                    // Can move closed tabs to any closed window
                    if(!new_parent_tyval || new_parent_tyval.val.isOpen) return false;
                }
            }
            if(log.getLevel()<=log.levels.TRACE) console.log('OK to move');
        } //endif move_node

        // If we made it here, the operation is OK.

        // If we're not in the middle of a dnd, this is the conclusion of a
        // move.  Set up to take action once the move completes.
        // The reason() check is because, if we got here because of an event
        // triggered by Chrome itself, there's nothing more to do.
        if( (operation==='move_node') && (!more || !more.dnd) &&
            (T.treeobj.reason() !== 'chrome')
        ) {

            let old_parent = T.treeobj.get_node(node.parent);

            // If we are moving the last tab out of a window other than the
            // holding pen, set up the window to be deleted once the
            // move completes.
            if( !tyval.val.isOpen &&
                old_parent &&
                old_parent.children &&
                (node.id !== T.holding_node_id) &&
                (old_parent.id !== T.holding_node_id) &&
                (new_parent.id !== T.holding_node_id) &&
                (new_parent.id !== old_parent.id) &&
                (old_parent.children.length === 1)
            ) {
                T.treeobj.element.one('move_node.jstree', remove_empty_window);
            } else

            // If we are moving an open tab, set up to move the tab in Chrome.
            if( tyval.val.isOpen &&
                old_parent &&
                (node.id !== T.holding_node_id) &&
                (old_parent.id !== T.holding_node_id) &&
                (new_parent.id !== T.holding_node_id)
            ) {
                T.treeobj.element.one('move_node.jstree',
                                            move_open_tab_in_window);
            }

        } //endif this is a non-dnd move

        return true;
    } //inner

    return inner;

    // Note on the code that doesn't check for more.dnd:
    // See https://github.com/vakata/jstree/issues/815 - the final node move
    // doesn't come from the dnd plugin, so doesn't have more.dnd.
    // It does have more.core, however.  We may need to save state from an
    // earlier call of this to a later call, but I hope not.

    // Note: if settings.dnd.check_while_dragging is false, we never get
    // a call to this function from the dnd plugin!

})(); //treeCheckCallback

//////////////////////////////////////////////////////////////////////////
// What's New //

/// Check whether to show a "what's new" notification.
/// Sets ShowWhatIsNew, used by getHamburgerMenuItems().
/// Function hamSettings() updates the K.LASTVER_KEY information.
function checkWhatIsNew(selector)
{
    chrome.storage.local.get(K.LASTVER_KEY, function(items) {
        let should_notify = true;           // unless proven otherwise
        let first_installation = true;      // ditto

        // Check whether the user has seen the notification
        if(typeof(chrome.runtime.lastError) === 'undefined') {
            let lastver = items[K.LASTVER_KEY];
            if( (lastver !== null) && (typeof lastver === 'string') ) {
                first_installation = false;
                if(lastver === TABFERN_VERSION) {   // the user has already
                    should_notify = false;          // seen the notification.
                }
            }
        }

        if(should_notify) {
            ShowWhatIsNew = true;
            // Put a notification icon on the hamburger
            let i = $(selector + ' .jstree-anchor i');
            i.addClass('tf-notification');
            i.one('click', function() { i.removeClass('tf-notification'); });
        }

        if(first_installation) {
            chrome.storage.local.set(
                { [K.LASTVER_KEY]: 'installed, but no version viewed yet' },
                function() {
                    ignore_chrome_error();
                    openWindowForURL('https://cxw42.github.io/TabFern/#usage');
                }
            );
        }

    });
} //checkWhatIsNew

//////////////////////////////////////////////////////////////////////////
// Startup / shutdown //

// This is done in vaguely continuation-passing style.  TODO make it cleaner.
// Maybe use promises?

/// The last function to be called after all other initialization has
/// completed successfully.
function initTreeFinal()
{
    if(!was_loading_error) {
        did_init_complete = true;
        // Assume the document is loaded by this point.
        $(K.INIT_MSG_SEL).css('display','none');
            // just in case initialization took a long time, and the message
            // already appeared.

        // If the user wishes, sort the open windows to the top.  Do this only
        // if everything initialized successfully, since hamSortOpenToTop
        // is not guaranteed to work correctly otherwise.
        if(getBoolSetting(CFG_OPEN_TOP_ON_STARTUP)) {
            ASQ().val(hamSortOpenToTop);
        }

    } //endif loaded OK
} //initTreeFinal()

function initTree4(items)
{   // move the popup window to its last position/size.
    // If there was an error (e.g., nonexistent key), just
    // accept the default size.

    if(typeof(chrome.runtime.lastError) === 'undefined') {
        let parsed = items[K.LOCN_KEY];
        if( (parsed !== null) && (typeof parsed === 'object') ) {
            // + and || are to provide some sensible defaults - thanks to
            // https://stackoverflow.com/a/7540412/2877364 by
            // https://stackoverflow.com/users/113716/user113716
            let size_data =
                {
                      'left': +parsed.left || 0
                    , 'top': +parsed.top || 0
                    , 'width': Math.max(+parsed.width || 300, 100)
                        // don't let it shrink too small, in case something went wrong
                    , 'height': Math.max(+parsed.height || 600, 200)
                };
            last_saved_size = $.extend({}, size_data);
            chrome.windows.update(my_winid, size_data);
        }
    } //endif no error

    // Start the detection of moved or resized windows
    setTimeout(timedResizeDetector, K.RESIZE_DETECTOR_INTERVAL_MS);

    initTreeFinal();
} //initTree4()

function initTree3()
{
    // Set event listeners
    T.treeobj.element.on('changed.jstree', treeOnSelect);

    T.treeobj.element.on('move_node.jstree', K.nextTickRunner(saveTree));
        // Save after drag-and-drop.  TODO? find a better way to do this?

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
    chrome.storage.local.get(K.LOCN_KEY, initTree4);
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

        let existing_win = winAlreadyExists(win);
        if(!existing_win) {
            createNodeForWindow(win, K.WIN_NOKEEP);
        } else {
            // Attach the open window to the saved window
            log.info('Found existing window in the tree: ' + existing_win.val.raw_title);
            D.windows.change_key(existing_win.val, 'win_id', win.id);
            existing_win.val.isOpen = true;
            // don't change val.keep, which may have either value.
            existing_win.val.win = win;
            T.treeobj.add_multitype(existing_win.node, K.NST_OPEN);
            if(existing_win.val.keep === K.WIN_KEEP) {
                T.treeobj.add_multitype(existing_win.node, K.NST_SAVED);
            }

            T.treeobj.open_node(existing_win.node);
            T.treeobj.redraw_node(existing_win.node);

            // If we reach here, win.tabs.length === existing_win.node.children.length.
            for(let idx=0; idx < win.tabs.length; ++idx) {
                let tab_node_id = existing_win.node.children[idx];
                let tab_val = D.tabs.by_node_id(tab_node_id);
                if(!tab_val) continue;

                let ctab = win.tabs[idx];

                tab_val.win_id = win.id;
                tab_val.index = idx;
                tab_val.tab = ctab;
                tab_val.raw_url = ctab.url || 'about:blank';
                tab_val.raw_title = ctab.title || '## Unknown title ##';
                tab_val.isOpen = true;
                D.tabs.change_key(tab_val, 'tab_id', tab_val.tab.id);
                T.treeobj.add_multitype(tab_node_id, K.NST_OPEN);

                if(ctab.favIconUrl) {
                    T.treeobj.set_icon(tab_node_id, encodeURI(ctab.favIconUrl));
                } else if((/\.pdf$/i).test(tab_val.raw_url)) {
                    T.treeobj.set_icon(tab_node_id,
                                        'fff-page-white-with-red-banner');
                } else {
                    T.treeobj.set_icon(tab_node_id, 'fff-page');
                }
                I.refresh_label(tab_node_id);
            } //foreach tab
        } //endif window already exists
    } //foreach window

    // Highlight the focused window.
    // However, generally the popup will be focused when this runs,
    // and we're not showing the popup in the tree.
    if(focused_win_id) {
        winOnFocusChanged(focused_win_id, true);
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

    // Init the main jstree
    log.info('TabFern tree.js initializing tree in window ' + win_id.toString());

    let contextmenu_items =
        getBoolSetting(CFG_ENB_CONTEXT_MENU, true) ? getMainContextMenuItems
                                                    : false;

    T.create('#maintree', treeCheckCallback, dndIsDraggable,
            contextmenu_items);

    // Install keyboard shortcuts.  This includes the keyboard listener for
    // context menus.
    Modules.shortcuts.install(
        {
            window,
            keybindings: Modules.default_shortcuts,
            drivers: [Modules.dmauro_keypress]
        },
        function initialized(err) {
            if ( err ) {
                console.log('Failed loading a shortcut driver!  Initializing context menu with no shortcut driver.  ' + err);
                Bypasser = Modules.bypasser.create(window, T.treeobj);

                // Continue initialization by loading the tree
                loadSavedWindowsIntoTree(initTree2);

            } else {
                Bypasser = Modules.bypasser.create(window, T.treeobj, Modules.shortcuts);

                // Continue initialization by loading the tree
                loadSavedWindowsIntoTree(initTree2);
            }
        }
    );
} //initTree1()

function initTree0()
{
    log.info('TabFern tree.js initializing view - ' + TABFERN_VERSION);

    if(getBoolSetting(CFG_HIDE_HORIZONTAL_SCROLLBARS, false)) {
        document.querySelector('html').classList += ' tf--feature--hide-horizontal-scrollbars';
    }

    Hamburger = Modules.hamburger('#hamburger-menu', getHamburgerMenuItems
            , K.CONTEXT_MENU_MOUSEOUT_TIMEOUT_MS
            );

    checkWhatIsNew('#hamburger-menu');

    initFocusHandler();

    // Stash our current size, which is the default window size.
    newWinSize = getWindowSize(window);

    // TODO? get screen size of the current monitor and make sure the TabFern
    // window is fully visible -
    // chrome.windows.create({state:'fullscreen'},function(win){console.log(win); chrome.windows.remove(win.id);})
    // appears to provide valid `win.width` and `win.height` values.
    // TODO? also make sure the TabFern window is at least 300px wide, or at
    // at least 30% of screen width if <640px.  Also make sure that the
    // TabFern window is tall enough.
    // TODO? Snap the TabFern window to within n pixels of the Chrome window?

    // Get our Chrome-extensions-API window ID from the background page.
    // I don't know a way to get this directly from the JS window object.
    // TODO maybe getCurrent?  Not sure if that's reliable.
    chrome.runtime.sendMessage(MSG_GET_VIEW_WIN_ID, initTree1);
} //initTree0

/// Save the tree on window.unload
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
        $(K.INIT_MSG_SEL).css('display','block');
    }
} //initIncompleteWarning()

//////////////////////////////////////////////////////////////////////////
// MAIN //

/// require.js modules used by this file
let dependencies = [
    // Modules that are not specific to TabFern
    'jquery', 'jstree', 'jstree-actions', 'jstree-flagnode',
    'jstree-because',
    'loglevel', 'hamburger', 'bypasser', 'multidex', 'justhtmlescape',
    'signals', 'local/fileops/export', 'local/fileops/import',
    'asynquence-contrib',

    // Modules for keyboard-shortcut handling.  Not really TabFern-specific,
    // but not yet disentangled fully.
    'shortcuts', 'dmauro_keypress', 'shortcuts_keybindings_default',

    // Modules of TabFern itself
    'view/const', 'view/item_details', 'view/sorts', 'view/item_tree',
    'view/item',
];

/// Make short names in Modules for some modules.  shortname => longname
let module_shortnames = {
    exporter: 'local/fileops/export',
    importer: 'local/fileops/import',
    default_shortcuts: 'shortcuts_keybindings_default',
};

function main(...args)
{
    // Hack: Copy the loaded modules into our Modules global
    for(let depidx = 0; depidx < args.length; ++depidx) {
        Modules[dependencies[depidx]] = args[depidx];
    }

    // Easier names for some modules
    for(let shortname in module_shortnames) {
        Modules[shortname] = Modules[module_shortnames[shortname]];
    }

    local_init();

    // Timer to display the warning message if initialization doesn't complete
    // quickly enough.
    window.setTimeout(initIncompleteWarning, K.INIT_TIME_ALLOWED_MS);

    // Main events
    window.addEventListener('unload', shutdownTree, { 'once': true });
    window.addEventListener('resize', eventOnResize);
        // This doesn't detect window movement without a resize, which is why
        // we have timedResizeDetector above.

    callbackOnLoad(initTree0);      // Fire off the main init

} // main()

require(dependencies, main);

// ###########################################################################

//TODO test what happens when Chrome exits.  Does the background page need to
//save anything?

// Notes:
// can get T.treeobj from $(selector).data('jstree')
// can get element from T.treeobj.element

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
