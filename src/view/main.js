// main.js: main script for the popup window of TabFern
// cxw42, 2017

// TODO break this into some separate modules

// Design decision: data is stored and manipulated in its native, unescaped
// form up until the point of use.  It is then escaped for HTML, CSS, or
// whatever is needed at that point.  Variable names starting with "raw_"
// hold the raw data.

// Design decision:
// Save data are {tabfern: 42, version: <whatever>, tree: []}.
// (`tabfern: 42` is magic :) )  Current [] save data
// are version 0.  We must always support loading
// backup files having versions earlier than the current version.
// In any save file, missing fields are assumed to be falsy.  Do not assume
// any specific false value.
// Bump the version number of the save file only when:
//  - You move or delete an existing field; or
//  - You add a new field for which a default falsy value is unworkable.

// Notation:
//
// Windows can be open or closed, and can be saved or unsaved.
// A closed, unsaved window isn't represented in TabFern, except in the
// "Restore last deleted window" function.
// An open, unsaved window is referred to for brevity as an "ephemeral" window.
//
// A "Fern" is the subtree for a particular window, including a node
// representing the window and zero or more children of that node
// representing tabs.  The fern ID is the node ID of the node
// representing the window.
//
// An "item" is the combination of a node (view/item_tree.js) and a
// details value (view/item_details.js) for that node.  An item may be
// associated with a Chrome widget (Window or Tab) or not.  Each Chrome widget
// is associated with exactly one item.
// Current item types are window and tab.
// Items are uniquely identified by their node_ids in the tree.

console.log('Loading TabFern ' + TABFERN_VERSION);

//////////////////////////////////////////////////////////////////////////
// Modules //

// Hacks so I can keep everything in the global scope for ease of
// use or inspection in the console while developing.
// TODO figure out a better way.

/// Modules loaded via requirejs
let Modules = {};

/// Constants loaded from view/const.js, for ease of access
let K;

/// Shorthand access to the details, view/item_details.js (formerly "Model")
let M;

/// Shorthand access to the tree, view/item_tree.js ("Tree")
let T;

/// Shorthand access to the item routines, view/item.js (formerly "Glue")
let G;

/// HACK - a global for loglevel because typing `Modules.log` everywhere is a pain.
let log;

//////////////////////////////////////////////////////////////////////////
// Globals //

// - Operation state -
let my_winid;                   ///< window ID of this popup window

/// Window ID of the currently-focused window, as best we understand it.
let currently_focused_winid = null;

/// HACK to avoid creating extra tree items.
let window_is_being_restored = false;

/// The size of the last-closed window, to be used as the
/// size of newly-opened windows (whence the name).
/// Should always have a valid value.
let newWinSize = {left: 0, top: 0, width: 300, height: 600};

/// The sizes of the currently-open windows, for use in setting #newWinSize.
/// The size of this popup, and other non-normal windows, is not tracked here.
let winSizes={};

// TODO use content scripts to catch window resizing, a la
// https://stackoverflow.com/q/13141072/2877364

/// Whether to show a notification of new features
let ShowWhatIsNew = false;

/// Array of URLs of the last-deleted window
let lastDeletedWindow;

/// Did initialization complete successfully?
let did_init_complete = false;

/// Are we running in development mode (unpacked)?
let is_devel_mode = false;

// - Module instances -

/// The hamburger menu
let Hamburger;

/// An escaper
let Esc;

/// The module that handles <Shift> bypassing of the jstree context menu
let Bypasser;

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
    M = Modules['view/item_details'];
    T = Modules['view/item_tree'];
    G = Modules['view/item'];

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
        let tab_val = M.tabs.by_node_id(tab_node_id);
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
///     If provided, will be called when saving is complete.
///     Called with the save data.
function saveTree(save_ephemeral_windows = true, cbk = undefined)
{
    // Get the raw data for the whole tree.  Can't use $(...) because closed
    // tree nodes aren't in the DOM.
    let root_node = T.treeobj.get_node($.jstree.root);    //from get_json() src
    if(!root_node || !root_node.children) return;

    let result = [];    // the data to be saved

    // Clean up the data
    for(let win_node_id of root_node.children) {
        let win_node = T.treeobj.get_node(win_node_id);

        // Don't save windows with no children
        if( (typeof(win_node.children) === 'undefined') ||
            (win_node.children.length === 0) ) {
            continue;
        }

        let win_val = M.windows.by_node_id(win_node.id);
        if(!win_val) continue;

        // Don't save ephemeral windows unless we've been asked to.
        let is_ephemeral = win_val.isOpen && (win_val.keep==K.WIN_NOKEEP);
        if( is_ephemeral && !save_ephemeral_windows ) continue;

        let result_win = {};       // what will hold our data

        result_win.raw_title = win_val.raw_title;
        result_win.tabs = [];
        if(is_ephemeral) result_win.ephemeral = true;
            // Don't bother putting it in if we don't need it.

        // Stash the tabs.  No recursion at this time.
        if(win_node.children) {
            for(let tab_node_id of win_node.children) {
                let tab_val = M.tabs.by_node_id(tab_node_id);
                if(!tab_val) continue;

                let thistab = {};
                thistab.raw_title = tab_val.raw_title;
                thistab.raw_url = tab_val.raw_url;
                // TODO save favIconUrl?

                if(T.treeobj.get_type(tab_node_id) === K.NT_TAB_BORDERED) {
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
                    cbk(to_save[K.STORAGE_KEY]);
                }
                return;     // Saved OK
            }
            let msg = "TabFern: couldn't save: " +
                            chrome.runtime.lastError.toString();
            log.error(msg);
            window.alert(msg);     // The user needs to know
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
    let win_val = M.windows.by_node_id(node_id);
    if(!win_val) return;

    // TODO replace window.prompt with an in-DOM GUI.
    let win_name = window.prompt('New window name?',
            T.remove_unsaved_markers(G.get_win_raw_text(win_val)));
    if(win_name === null) return;   // user cancelled

    win_val.raw_title = win_name;
    G.remember(node_id);
        // assume that a user who bothered to rename a node
        // wants to keep it.

    saveTree();
} //actionRenameWindow()

/// Mark a window as K.NOKEEP but don't close it
function actionForgetWindow(node_id, node, unused_action_id, unused_action_el)
{
    let win_val = M.windows.by_node_id(node_id);
    if(!win_val) return;

    win_val.keep = K.WIN_NOKEEP;
    if(win_val.raw_title !== null) {
        win_val.raw_title += ' (Unsaved)';
    }

    G.refresh_label(node_id);

    if(win_val.isOpen) {    // should always be true, but just in case...
        T.treeobj.set_type(node, K.NT_WIN_EPHEMERAL);
    }

    saveTree();
} //actionForgetWindow()

/// Close a window, but don't delete its tree nodes.  Used for saving windows.
/// ** The caller must call saveTree() --- actionCloseWindow() does not.
function actionCloseWindow(node_id, node, unused_action_id, unused_action_el)
{
    let win_val = M.windows.by_node_id(node_id);
    if(!win_val) return;
    let win = win_val.win;

    // Mark the tree node closed
    win_val.win = undefined;
        // Prevents winOnRemoved() from calling us to handle the removal!
    M.windows.change_key(win_val, 'win_id', K.NONE);
        // Can't access by win_id, but can still access by node_id.

    // TODO winOnFocusChanged(NONE) ?

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
    win_val.raw_title = T.remove_unsaved_markers(win_val.raw_title);
    G.remember(node_id);

    // Collapse the tree, if the user wants that
    if(getBoolSetting("collapse-tree-on-window-close")) {
        T.treeobj.close_node(node);
    }

    // Mark the tabs in the tree node closed.
    for(let tab_node_id of node.children) {
        let tab_val = M.tabs.by_node_id(tab_node_id);
        if(!tab_val) continue;

        tab_val.tab = undefined;
        tab_val.win_id = K.NONE;
        tab_val.index = K.NONE;
        tab_val.isOpen = false;
        M.tabs.change_key(tab_val, 'tab_id', K.NONE);
        // raw_url and raw_title are left alone
    }
} //actionCloseWindow

function actionDeleteWindow(node_id, node, unused_action_id, unused_action_el)
{
    // Close the window and adjust the tree
    actionCloseWindow(node_id, node, unused_action_id, unused_action_el);

    lastDeletedWindow = [];
    // Remove the tabs from M.tabs
    for(let tab_node_id of node.children) {
        let tab_val = M.tabs.by_node_id(tab_node_id);
        if(!tab_val) continue;
        M.tabs.remove_value(tab_val);
        // Save the URLs for "Restore last deleted"
        lastDeletedWindow.push(tab_val.raw_url);
    }

    // Remove the window's node and value
    let scrollOffsets = [window.scrollX, window.scrollY];
    T.treeobj.delete_node(node_id);   //also deletes child nodes
    window.scrollTo(...scrollOffsets);

    let win_val = M.windows.by_node_id(node_id);
    M.windows.remove_value(win_val);

    saveTree();
} //actionDeleteWindow

/// Toggle the top border on a node.  This is a hack until I can add
/// dividers.
function actionToggleTabTopBorder(node_id, node, unused_action_id, unused_action_el)
        //node_id, node, unused_action_id, unused_action_el)
{
    let tab_val = M.tabs.by_node_id(node_id);
    if(!tab_val) return;

    // Note: adjust this if you add another NT_TAB type.
    if(T.treeobj.get_type(node_id) !== K.NT_TAB_BORDERED) {
        T.treeobj.set_type(node_id, K.NT_TAB_BORDERED);
    } else {
        T.treeobj.set_type(node_id, K.NT_TAB);
    }

    G.remember(node.parent);

    saveTree();
} //actionToggleTabTopBorder

/// Edit a node's bullet
function actionEditBullet(node_id, node, unused_action_id, unused_action_el)
{
    let {ty, val} = G.get_node_tyval(node_id);
    if(!val) return;

    // TODO replace window.prompt with an in-DOM GUI.
    let new_bullet = window.prompt('Note for this ' +
            (ty === K.IT_WINDOW ? 'window' : 'tab') + '?',
            val.raw_bullet || '');
    if(new_bullet === null) return;   // user cancelled

    val.raw_bullet = new_bullet;
    G.refresh_label(node_id);

    G.remember(node.parent);
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
        let tab_val = M.tabs.by_tab_id(ctab.id);
        if(tab_val) {
            log.error('Refusing to create node for existing tab ' + ctab.id);
            return;
        }
    } // /debug

    let {node_id, val} = G.makeItemForTab(parent_node_id, ctab);
    addTabNodeActions(node_id);

    return node_id;
} //createNodeForTab

/// Create a tree node for a closed tab
/// @param tab_data_v1      V1 save data for the tab
/// @param parent_node_id   The node id for a closed window
/// @return node_id         The node id for the new tab
function createNodeForClosedTab(tab_data_v1, parent_node_id)
{
    let node_type = (tab_data_v1.bordered ? K.NT_TAB_BORDERED : K.NT_TAB);
    let {node_id, val} = G.makeItemForTab(
            parent_node_id, false,      // false => no Chrome window open
            tab_data_v1.raw_url,
            tab_data_v1.raw_title,
            node_type);

    if(tab_data_v1.raw_bullet) {
        val.raw_bullet = String(tab_data_v1.raw_bullet);
        G.refresh_label(node_id);
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

    let {node_id, val} = G.makeItemForWindow(cwin, keep);
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
    let {node_id, val} = G.makeItemForWindow();

    // Mark recovered windows
    if(is_ephemeral) {
        T.treeobj.set_type(node_id, K.NT_RECOVERED);
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

    G.refresh_label(node_id);

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
let was_loading_error = false;

/// Add the save data into the tree.
/// Design decision: TabFern SHALL always be able to load older save files.
/// Never remove a loader from this function.
/// @post The new windows are added after any existing windows in the tree
/// @param {mixed} data The save data, parsed (i.e., not a JSON string)
/// @return {number} the number of new windows, or,falsy on failure.
let loadSavedWindowsFromData = (function(){

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

            if(!loader_retval) {
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
            if(!loadSavedWindowsFromData(parsed)) {
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

/// Process clicks on items in the tree.  Also works for keyboard navigation
/// with arrow keys and Enter.
/// TODO break "open window" out into a separate function.
function treeOnSelect(_evt_unused, evt_data)
{
    //log.info(evt_data.node);
    if(typeof evt_data.node === 'undefined') return;

    let node = evt_data.node;
    let node_val, is_tab=false, is_win=false;

    let win_id;     // If assigned, this window will be brought to the front
                    // at the end of this function.

    if(node_val = M.tabs.by_node_id(node.id)) {
        is_tab = true;
    } else if(node_val = M.windows.by_node_id(node.id)) {
        is_win = true;
    } else {
        log.error('Selection of unknown node '+node);
        return;     // unknown node type
    }

    // TODO figure out why this doesn't work: T.treeobj.deselect_node(node, true);
    T.treeobj.deselect_all(true);
        // Clear the selection.  True => no event due to this change.
    //log.info('Clearing flags treeonselect');
    T.treeobj.clear_flags(true);

    // --------
    // Now that the selection is clear, see if this actually should have been
    // an action-button click.

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

            log.info({'Actually, button press':elem, action});

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

    // --------
    // Process the actual node click

    if(T.treeobj.get_type(node) === K.NT_RECOVERED) {
        T.treeobj.set_type(node, 'default');
    }

    if(is_tab && node_val.isOpen) {   // An open tab
        chrome.tabs.highlight({
            windowId: node_val.win_id,
            tabs: [node_val.index]     // Jump to the clicked-on tab
        });
        //log.info('flagging treeonselect' + node.id);
        T.treeobj.flag_node(node);
        win_id = node_val.win_id;

    } else if(is_win && node_val.isOpen) {    // An open window
        win_id = node_val.win_id;

    } else if(!node_val.isOpen && (is_tab || is_win) ) {
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
            win_val = M.windows.by_node_id(parent_node_id);
            if(!win_val) return;
        }

        // Grab the URLs for all the tabs
        let urls=[];
        let expected_tab_count = win_node.children.length;
        for(let child_id of win_node.children) {
            let child_val = M.tabs.by_node_id(child_id);
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
                M.windows.change_key(win_val, 'win_id', win.id);

                win_val.isOpen = true;
                win_val.keep = true;      // just in case
                win_val.win = win;
                T.treeobj.set_type(win_node.id, K.NT_WIN_OPEN);

                T.treeobj.open_node(win_node);

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
                    let tab_val = M.tabs.by_node_id(tab_node_id);
                    if(!tab_val) continue;

                    let tab = win.tabs[idx];

                    tab_val.win_id = win.id;
                    tab_val.index = idx;
                    tab_val.tab = tab;
                    tab_val.raw_url = tab.url || 'about:blank';
                    tab_val.raw_title = tab.title || '## Unknown title ##';
                    tab_val.isOpen = true;
                    M.tabs.change_key(tab_val, 'tab_id', tab_val.tab.id);
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

                        // TODO if a tab was clicked on, focus that particular tab

                    } //get callback
                ); //windows.get

            } //create callback
        ); //windows.created

    } else {    // it's a node type we don't know how to handle.
        log.error('treeOnSelect: Unknown node ' + node);
    }

    if(typeof win_id !== 'undefined') {
        // Activate the window, if it still exists.
        chrome.windows.get(win_id, function(win) {
            if(typeof(chrome.runtime.lastError) !== 'undefined') return;
            chrome.windows.update(win_id, {focused: true}, K.ignore_chrome_error);
        });
    }
} //treeOnSelect

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

    // Stash the size of the window being closed as the size for
    // reopened windows.
    if(win_id in winSizes) {
        // TODO only do this is win_id's type is "normal"
        newWinSize = winSizes[win_id];
        delete winSizes[win_id];
    }

    let node_val = M.windows.by_win_id(win_id);
    if(!node_val) return;   // e.g., already closed
    let node_id = node_val.node_id;
    if(!node_id) return;
    let node = T.treeobj.get_node(node_id);
    if(!node) return;

    winOnFocusChanged(K.NONE);        // Clear the highlights.

    if(node_val.keep) {
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
function winOnFocusChanged(win_id)
{
    //log.info('Window focus-change triggered: ' + win_id);

    if(win_id == my_winid) {
        //log.info('Clearing flags winonfocuschanged to popup');
        T.treeobj.clear_flags();
    }

    chrome.windows.getLastFocused({}, function(win){
        let new_win_id;
        if(!win.focused) {
            new_win_id = K.NONE;
        } else {
            new_win_id = win.id;
        }

        log.info('Focus change from ' + currently_focused_winid + ' to ' + win_id + '; lastfocused ' + win.id);

        // Clear the focus highlights if we are changing windows.
        // Avoid flicker if the selection is staying in the same window.
        if(new_win_id === currently_focused_winid) return;

        // Update the size of new windows - TODO see if this works in practice
        if(win.type === 'normal') {
            winSizes[win.id] = getWindowSizeFromWindowRecord(win);
            newWinSize = winSizes[win.id];
        }

        //log.info('Clearing focus classes');
        $('.' + K.WIN_CLASS + ' > a').removeClass(K.FOCUSED_WIN_CLASS);

        currently_focused_winid = new_win_id;

        if(new_win_id === K.NONE) return;

        // Get the window
        let window_node_id = M.windows.by_win_id(new_win_id, 'node_id');
        //log.info('Window node ID: ' + window_node_id);
        if(!window_node_id) return;
            // E.g., if new_win_id corresponds to this view.

        // Make the window's entry bold, but no other entries.
        // This seems to need to run after a yield when dragging
        // tabs between windows, or else the K.FOCUSED_WIN_CLASS
        // doesn't seem to stick.

        // TODO change this to use flag_node instead.
        setTimeout(function(){
            //log.info('Setting focus class');
            $('#' + window_node_id + ' > a').addClass(K.FOCUSED_WIN_CLASS);
            //log.info($('#' + window_node_id + ' > a'));
        },0);
    });

} //winOnFocusChanged

/// Process creation of a tab.  NOTE: in Chrome 60.0.3112.101, we sometimes
/// get two consecutive tabs.onCreated events for the same tab.  Therefore,
/// we check for that here.
function tabOnCreated(tab)
{
    log.info({'Tab created': tab.id, tab});

    let win_node_id = M.windows.by_win_id(tab.windowId, 'node_id')
    if(!win_node_id) return;

    let tab_node_id;

    // See if this is a duplicate of an existing tab
    let tab_val = M.tabs.by_tab_id(tab.id);

    if(tab_val === undefined) {     // If not, create the tab
        let tab_node_id = createNodeForTab(tab, win_node_id);   // Adds at end
        T.treeobj.move_node(tab_node_id, win_node_id, tab.index);
            // Put it in the right place
    } else {
        log.info('   - That tab already exists.');
        T.treeobj.move_node(tab_val.node_id, win_node_id, tab.index);
            // Just put it where it now belongs.
    }

    updateTabIndexValues(win_node_id);
    T.vscroll_function();
    saveTree();
} //tabOnCreated

function tabOnUpdated(tabid, changeinfo, tab)
{
    log.info({'Tab updated': tabid, changeinfo, tab});

    let tab_node_val = M.tabs.by_tab_id(tabid);
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
    G.refresh_label(tab_node_id);

    {   // set the icon
        let icon_text;
        if(changeinfo.favIconUrl) {
            icon_text = encodeURI(changeinfo.favIconUrl);
        } else if(tab.favIconUrl) {
            icon_text = encodeURI(tab.favIconUrl);
        } else {
            icon_text = 'fff-page';
        }
        T.treeobj.set_icon(tab_node_id, icon_text);
    }

    saveTree();
} //tabOnUpdated

/// Handle movements of tabs or tab groups within a window.
function tabOnMoved(tabid, moveinfo)
{
    log.info({'Tab moved': tabid, moveinfo});

    let from_idx = moveinfo.fromIndex;
    let to_idx = moveinfo.toIndex;

    // Get the parent (window)
    let window_node_id = M.windows.by_win_id(moveinfo.windowId, 'node_id');
    if(!window_node_id) return;

    // Get the tab's node
    let tab_node_id = M.tabs.by_tab_id(tabid, 'node_id');
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

    T.treeobj.move_node(tab_node_id, window_node_id, jstree_new_index);

    // Update the indices of all the tabs in this window.  This will update
    // the old tab and the new tab.
    updateTabIndexValues(window_node_id);

    saveTree();
} //tabOnMoved

function tabOnActivated(activeinfo)
{
    log.info({'Tab activated': activeinfo.tabId, activeinfo});

    winOnFocusChanged(activeinfo.windowId);

    // Highlight the active tab
    SELTAB: {
        // Get the tab's node
        let tab_node_id = M.tabs.by_tab_id(activeinfo.tabId, 'node_id');
        if(!tab_node_id) break SELTAB;

        //log.info('Clearing flags tabonactivate');
        T.treeobj.clear_flags();
        //log.info('flagging ' +tab_node_id);
        T.treeobj.flag_node(tab_node_id);
    }

    // No need to save --- we don't save which tab is active.
} //tabOnActivated

/// Delete a tab's information when the user closes it.
function tabOnRemoved(tabid, removeinfo)
{
    log.info({'Tab removed': tabid, removeinfo});

    // If the window is closing, do not remove the tab records.
    // The cleanup will be handled by winOnRemoved().
    if(removeinfo.isWindowClosing) return;

    let window_node_id = M.windows.by_win_id(removeinfo.windowId, 'node_id');
    if(!window_node_id) return;

    {   // Keep the locals here out of the scope of the closure below.
        // Get the parent (window)
        let window_node = T.treeobj.get_node(window_node_id);
        if(!window_node) return;

        // Get the tab's node
        let tab_node_id = M.tabs.by_tab_id(tabid, 'node_id');
        if(!tab_node_id) return;
        let tab_node = T.treeobj.get_node(tab_node_id);
        if(!tab_node) return;

        // Remove the node
        let tab_val = M.tabs.by_tab_id(tabid);
        M.tabs.remove_value(tab_val);
            // So any events that are triggered won't try to look for a
            // nonexistent tab.
        T.treeobj.delete_node(tab_node);
    }

    // Refresh the tab.index values for the remaining tabs
    updateTabIndexValues(window_node_id);

    T.vscroll_function();
    saveTree();
} //tabOnRemoved

// Sequence of events for a test tab detach:
//{Window created: 146, Restore?: "no", win: {…}}
//item.js:34 TabFern view/item.js:  {Adding nodeid map for cwinid: 146}
//main.js:1222 {Tab detached: 140, detachinfo: {…}}Tab detached: 140detachinfo: {oldPosition: 0, oldWindowId: 139}__proto__: Object
//main.js:1183 {Tab removed: 140, removeinfo: {…}}Tab removed: 140removeinfo: {isWindowClosing: false, windowId: 139}__proto__: Object <-- this also comes from us
//main.js:1161 {Tab activated: 142, activeinfo: {…}}Tab activated: 142activeinfo: {tabId: 142, windowId: 139}__proto__: Object
//main.js:1236 {Tab attached: 140, attachinfo: {…}}Tab attached: 140attachinfo: {newPosition: 0, newWindowId: 146}__proto__: Object
//main.js:1161 {Tab activated: 140, activeinfo: {…}}Tab activated: 140activeinfo: {tabId: 140, windowId: 146}__proto__: Object
//main.js:1012 Focus change from 139 to -1; lastfocused 146
//main.js:1012 Focus change from 146 to 139; lastfocused 146
//main.js:1057 {Tab created: 140, tab: {…}}     <-- this one comes from us - currently attach delegates to create.

// So the actual sequence is:
// - window created
// - detach
// - activate the new current tab in the existing window
// - attach
// TODO RESUME HERE - implement this

function tabOnDetached(tabid, detachinfo)
{
    // Don't save here?  Do we get a WindowCreated if the tab is not
    // attached to another window?
    log.info({'Tab detached': tabid, detachinfo});

    T.treeobj.clear_flags();  //just to be on the safe side

    let tab_val = M.tabs.by_tab_id(tabid);

    if(!tab_val)    // An express failure message - this would be bad
        throw new Error("Unknown tab to detach???? "+tabid+' '+detachinfo.toString());

    let old_win_val = M.windows.by_win_id(detachinfo.oldWindowId);
    if(!old_win_val)    // ditto
        throw new Error("Unknown window detaching from???? "+attachinfo.newWindowId+' '+attachinfo.toString());

    T.treeobj.move_node(tab_val.node_id, T.holding_node_id);
    tab_val.win_id = K.NONE;
    tab_val.index = K.NONE;

    updateTabIndexValues(old_win_val.node_id);

} //tabOnDetached

function tabOnAttached(tabid, attachinfo)
{
    log.info({'Tab attached': tabid, attachinfo});

    let tab_val = M.tabs.by_tab_id(tabid);

    if(!tab_val)        // An express failure message - this would be bad
        throw new Error("Unknown tab to attach???? "+tabid+' '+attachinfo.toString());

    let new_win_val = M.windows.by_win_id(attachinfo.newWindowId);
    if(!new_win_val)    // ditto
        throw new Error("Unknown window attaching to???? "+attachinfo.newWindowId+' '+attachinfo.toString());

    T.treeobj.move_node(tab_val.node_id, new_win_val.node_id,
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
let resize_save_timer_id;

/// A cache of the last size we saved to disk
let last_saved_size;

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
            function(){saveViewSize(size_data);}, 2000);

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
    saveTree(true, function(saved_info){
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
            if(!loadSavedWindowsFromData(parsed)) {
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
    if(loadSavedWindowsFromData(dat)) {
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
        items.jasmineItem = {
            label: 'Run Jasmine tests',
            action: hamRunJasmineTests,
            icon: 'fa fa-fort-awesome',
            separator_after: true,
        };
    }

    items.infoItem = {
            label: "About, help, and credits",
            title: "Online - the TabFern web site",
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
        win_val = M.windows.by_node_id(node.id);
        if(win_val) nodeType = K.IT_WINDOW;
    }

    if(!nodeType) {
        tab_val = M.tabs.by_node_id(node.id);
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

        if( win_val.isOpen && (win_val.keep == K.WIN_KEEP) ) {
            winItems.forgetItem = {
                label: "Forget but don't close",
                title: "Do not save this window when it is closed",
                icon: 'fa fa-chain-broken',
                action:
                    function(){actionForgetWindow(node.id, node, null, null);}
            };
        }

        winItems.closeItem = {
                label: 'Close and remember',
                icon: 'fff-picture-delete',
                action:
                    function(){actionCloseWindow(node.id, node, null, null);}
            };

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
/// At present, we only support reordering windows.
/// @param {array} nodes The full jstree node record(s) being dragged
function dndIsDraggable(nodes, evt)
{
    if(log.getLevel() <= log.levels.TRACE) {
        console.group('is draggable?');
        console.log(nodes);
        console.groupEnd();
        //console.log($.jstree.reference(evt.target));
    }

    // If any node being dragged is anything other than a window or a closed
    // tab, it's not draggable.  Check all nodes for future-proofing, since we
    // may someday support multiselect.
    for(let node of nodes) {
        let tyval = G.get_node_tyval(node.id);
        if(!tyval) return false;    // don't drag nodes we don't know about

        // Can't drag open tabs
        if(tyval.ty === K.IT_TAB) {
            if(tyval.val.isOpen) return false;

            // Can't drag tabs that belong to open windows.  This is
            // for futureproofing --- at present, tabs cannot be closed
            // while their windows are open.
            if(node.parent !== $.jstree.root) {
                let parent_tyval = G.get_node_tyval(node.parent);
                if(!parent_tyval || parent_tyval.val.isOpen) return false;
            }
        }
    } //foreach node

    return true;    // Otherwise, it is draggable
} //dndIsDraggable

/// Determine whether a node is a valid drop target.
/// This function actually gets called for all changes to the tree,
/// so we permit everything except for invalid drops.
/// @param operation {string}
/// @param node {Object} The full jstree node record of the node that might
///                      be affected
/// @param node_parent {Object} The full jstree node record of the
///                             node to be the parent
/// @param more {mixed} optional object of additional data.
/// @return {boolean} whether or not the operation is permitted
///
function treeCheckCallback(
            operation, node, node_parent, node_position, more)
{
    // Don't log checks during initial tree population
    if(did_init_complete && (log.getLevel() <= log.levels.TRACE) ) {
        console.group('check callback for ' + operation);
        console.log(node);
        console.log(node_parent);
        //console.log(node_position);
        if(more) console.log(more);
        if(!more || !more.dnd) {
            console.group('Not drag and drop');
            console.trace();
            console.groupEnd();
        }
        console.groupEnd();
    } //logging

    let tyval = G.get_node_tyval(node.id);
    if(!tyval) return false;    // sanity check

    let parent_tyval;
    if(node_parent.id !== $.jstree.root) {
        parent_tyval = G.get_node_tyval(node_parent.id);
    }

    // When dragging, you can't drag windows into another node, or
    // anywhere but the root.  You can drag closed tabs only into and
    // out of closed windows.
    if(more && more.dnd && operation==='move_node') {

        if(tyval.ty === K.IT_WINDOW) {
            // Can't drop inside - only before or after
            if(more.pos==='i') return false;

            // Can't drop other than in the root
            if(node_parent.id !== $.jstree.root) return false;

        } else if(tyval.ty === K.IT_TAB) {
            // Tabs: Can only drop closed tabs in closed windows
            if(tyval.val.isOpen) return false;
            if(!parent_tyval || parent_tyval.val.isOpen) return false;
            if(parent_tyval.ty !== K.IT_WINDOW) return false;
        }
    }

    // When moving, e.g., at drag end, you can't drop a window other than
    // in the root.
    if(operation==='move_node') {

        if(log.getLevel() <= log.levels.TRACE) {
            console.group('check callback for ' + operation);
            console.log(tyval);
            console.log(node);
            console.log(node_parent);
            if(more) console.log(more);
            console.groupEnd();
        }

        // Windows: can only drop in root
        if(tyval.ty === K.IT_WINDOW) {
            if(node_parent.id !== $.jstree.root) return false;

        } else if(tyval.ty === K.IT_TAB) {
            // Can't move tabs between windows, except in and out of the
            // holding pen.
            let curr_parent_id = node.parent;
            let new_parent_id = node_parent.id;

            if( curr_parent_id !== T.holding_node_id &&
                new_parent_id !== T.holding_node_id &&
                curr_parent_id !== new_parent_id) return false;
        }
    } //endif move_node

    // See https://github.com/vakata/jstree/issues/815 - the final node move
    // doesn't come from the dnd plugin, so doesn't have more.dnd.
    // It does have more.core, however.  We may need to save state from an
    // earlier call of this to a later call, but I hope not.

    // Note: if settings.dnd.check_while_dragging is false, we never get
    // a call to this function from the dnd plugin!

    return true;    // If we made it here, we're OK.
} //treeCheckCallback

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
    }
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

/// See whether a window corresponds to an already-saved, closed window.
/// This may happen, e.g., due to TabFern refresh or Chrome reload.
/// @return the existing window's node and value, or false if no match.
function winAlreadyExists(new_win)
{
    WIN:
    for(let existing_win_node_id of T.treeobj.get_node($.jstree.root).children) {

        // Is it already open?  If so, don't hijack it.
        // This also catches non-window nodes such as the holding pen.
        let existing_win_val = M.windows.by_node_id(existing_win_node_id);
        if(!existing_win_val || typeof existing_win_val.isOpen === 'undefined' ||
                existing_win_val.isOpen ) continue WIN;

        // Does it have the same number of tabs?  If not, skip it.
        let existing_win_node = T.treeobj.get_node(existing_win_node_id);
        if(existing_win_node.children.length != new_win.tabs.length)
            continue WIN;

        // Same number of tabs.  Are they the same URLs?
        for(let i=0; i<new_win.tabs.length; ++i) {
            let existing_tab_val = M.tabs.by_node_id(existing_win_node.children[i]);
            if(!existing_tab_val) continue WIN;
            if(existing_tab_val.raw_url !== new_win.tabs[i].url) continue WIN;
        }

        // Since all the tabs have the same URLs, assume we are reopening
        // an existing window.
        return {node: existing_win_node, val: existing_win_val};

    } //foreach existing window

    return false;
} //winAlreadyExists()

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
            log.info('Found existing window in the tree: ' + existing_win.val.raw_title);
            M.windows.change_key(existing_win.val, 'win_id', win.id);
            existing_win.val.isOpen = true;
            // don't change val.keep, which may have either value.
            existing_win.val.win = win;
            T.treeobj.set_type(existing_win.node,
                    existing_win.val.keep ? K.NT_WIN_OPEN :
                                            K.NT_WIN_EPHEMERAL );

            T.treeobj.open_node(existing_win.node);

            // If we reach here, win.tabs.length === existing_win.node.children.length.
            for(let idx=0; idx < win.tabs.length; ++idx) {
                let tab_node_id = existing_win.node.children[idx];
                let tab_val = M.tabs.by_node_id(tab_node_id);
                if(!tab_val) continue;

                let tab = win.tabs[idx];

                tab_val.win_id = win.id;
                tab_val.index = idx;
                tab_val.tab = tab;
                tab_val.raw_url = tab.url || 'about:blank';
                tab_val.raw_title = tab.title || '## Unknown title ##';
                tab_val.isOpen = true;
                M.tabs.change_key(tab_val, 'tab_id', tab_val.tab.id);
            }

        }
    } //foreach window

    // Highlight the focused window.
    // However, generally the popup will be focused when this runs,
    // and we're not showing the popup in the tree.
    if(focused_win_id) {
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

    // Init the main jstree
    log.info('TabFern view.js initializing tree in window ' + win_id.toString());

    let contextmenu_items =
        getBoolSetting(CFG_ENB_CONTEXT_MENU, true) ? getMainContextMenuItems
                                                    : false;

    T.create('#maintree', treeCheckCallback, dndIsDraggable, contextmenu_items);

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
    log.info('TabFern view.js initializing view - ' + TABFERN_VERSION);

    document.title = 'TabFern ' + TABFERN_VERSION;

    Hamburger = Modules.hamburger('#hamburger-menu', getHamburgerMenuItems
            , K.CONTEXT_MENU_MOUSEOUT_TIMEOUT_MS
            );

    checkWhatIsNew('#hamburger-menu');

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
    'loglevel', 'hamburger', 'bypasser', 'multidex', 'justhtmlescape',
    'signals', 'local/fileops/export', 'local/fileops/import',

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

    // Fire off the main init
    if(document.readyState !== 'complete') {
        // Thanks to https://stackoverflow.com/a/28093606/2877364 by
        // https://stackoverflow.com/users/4483389/matthias-samsel
        window.addEventListener('load', initTree0, { 'once': true });
    } else {
        window.setTimeout(initTree0, 0);    //always async
    }
} // main()

require(dependencies, main);

window.addEventListener('load',     //DEBUG
        function() { console.log({'Load fired': document.readyState}); },
        { 'once': true });

// ###########################################################################
// ### End of real code
// ###########################################################################

//TODO test what happens when Chrome exits.  Does the background page need to
//save anything?

// Notes:
// can get T.treeobj from $(selector).data('jstree')
// can get element from T.treeobj.element

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
