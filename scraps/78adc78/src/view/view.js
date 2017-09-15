// view.js
// Uses jquery, jstree, jstree-actions, loglevel, common.js, all of which are
// loaded by view.html.

// Design decision: data is stored and manipulated in its native, unescaped
// form up until the point of use.  It is then escaped for HTML, CSS, or
// whatever is needed at that point.  Variable names starting with "raw_"
// hold the raw data.

// Design decision:
// Save data are {tabfern: 42, version: <whatever>, tree: []}.
// (`tabfern: 42` is magic :) )  Current [] save data
// are version 0.  We must always support loading
// backup files having versions earlier than the current version.

// Notation: Windows can be open or closed, and can be saved or unsaved.
// A closed, unsaved window isn't represented in TabFern, except in the
// "Restore last deleted window" function.
// An open, unsaved window is referred to for brevity as an "ephemeral" window.

//////////////////////////////////////////////////////////////////////////
// Constants //

const STORAGE_KEY='tabfern-data';
    ///< Store the saved windows/tabs
const LOCN_KEY='tabfern-window-location';
    ///< Store where the tabfern popup is
const LASTVER_KEY='tabfern-last-version';
    ///< Store the last version used on this system, for showing a
    ///< "What's New" notification

const SAVE_DATA_AS_VERSION=1;       // version we are currently saving

const WIN_CLASS='tabfern-window';     // class on all <li>s representing windows
const FOCUSED_WIN_CLASS='tf-focused-window';  // Class on the currently-focused win
const VISIBLE_WIN_CLASS='tf-visible-window';  // Class on all visible wins
const ACTION_GROUP_WIN_CLASS='tf-action-group';   // Class on action-group div

const INIT_TIME_ALLOWED_MS = 3000;  // After this time, if init isn't done,
                                    // display an error message.
const INIT_MSG_SEL = 'div#init-incomplete';     // Selector for that message

const CLASS_RECOVERED = 'ephemeral-recovered';

/// How often to check whether our window has been moved or resized
const RESIZE_DETECTOR_INTERVAL_MS = 5000;

// --- Syntactic sugar ---
const WIN_KEEP = true;
const WIN_NOKEEP = false;
const NONE = chrome.windows.WINDOW_ID_NONE;

// Node-type enumeration.  Here because there may be more node types
// in the future (e.g., dividers or plugins).  Each NT_* must be truthy.
const NT_WINDOW = 'window';
const NT_TAB = 'tab';

// Node-type names
const NTN_RECOVERED = 'ephemeral_recovered';

//////////////////////////////////////////////////////////////////////////
// Globals //

// - Model -
let mdTabs;                     ///< Map between open-tab IDs and node IDs
let mdWindows;                  ///< Map between open-window IDs and node IDs

// - View -
let treeobj;                    ///< The jstree instance

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

// - Modules -

/// The keyboard shortcuts handler, if any.
let Shortcuts;

/// The hamburger menu
let Hamburger;

/// An escaper
let Esc = HTMLEscaper();

/// The module that handles <Shift> bypassing of the jstree context menu
let Bypasser;

//////////////////////////////////////////////////////////////////////////
// Initialization //

// NOTE: as of writing, log.debug() is a no-op - see
// https://github.com/pimterry/loglevel/issues/111
log.setDefaultLevel(log.levels.INFO);
    // TODO change the default to ERROR or SILENT for production.

console.log('Loading TabFern ' + TABFERN_VERSION);

mdTabs = Multidex(
    [ //keys
        'tab_id'    // from Chrome
      , 'node_id'   // from jstree
    ],
    [ //other data
        'win_id'    // from Chrome
      , 'index'     // in the current window
      , 'tab'       // the actual Tab record from Chrome
      , 'raw_url'   // the tab's URL
      , 'raw_title' // the tab's title.  null => default.
      , 'isOpen'    // open or not
      // TODO save favIconUrl?
    ]);

mdWindows = Multidex(
    [ //keys
        'win_id'    // from Chrome
      , 'node_id'   // from jstree
    ],
    [ //other data
        'win'       // the actual Window record from chrome
      , 'raw_title' // the window's title (e.g., "Window")
      , 'isOpen'    // whether the window is open or not
      , 'keep'      // whether the window should be saved or not
    ]);

//////////////////////////////////////////////////////////////////////////
// General utility routines //

/// Find a node's value in the model, regardless of type.
/// @param node_ref {mixed} If a string, the node id; otherwise, anything
///                         that can be passed to jstree.get_node.
/// @return ret {object} .ty = NT_*; .val = the value, or
///                         .ty=false if the node wasn't found.
function get_node_val(node_ref)
{
    let retval = {ty: false, val: null};
    if(!node_ref) return retval;

    // Get the node ID
    let node_id;
    if(typeof node_ref === 'string') {
        node_id = node_ref;
    } else {
        let node = treeobj.get_node(node_ref);
        if(node === false) return retval;
        node_id = node.id;
    }

    // Check each piece of the model in turn
    let val, ty;
    val = mdWindows.by_node_id(node_id);
    if(val) {
        retval.ty = NT_WINDOW;
        retval.val = val;
        return retval;
    }

    val = mdTabs.by_node_id(node_id);
    if(val) {
        retval.ty = NT_TAB;
        retval.val = val;
        return retval;
    }

    return retval;
} //get_node_val

/// Sorting criterion for node text: by locale, ascending, case-insensitive.
/// If either node is unknown to the tree, it is sorted later.  If both nodes
/// are unknown, they are sorted equally.
/// @param a {mixed} One node, in any form acceptable to jstree.get_node()
/// @param b {mixed} The other node, in any form acceptable to jstree.get_node()
/// @return {Number} -1, 0, or 1
function compare_node_text(a, b)
{
    let a_text = treeobj.get_text(a);
    let b_text = treeobj.get_text(b);

    if(a_text === b_text) return 0;     // e.g., both unknown
    if(a_text === false) return 1;      // only #a unknown - it sorts later
    if(b_text === false) return -1;     // only #b unknown - it sorts later

    return a_text.localeCompare(b_text, undefined, {sensitivity:'base'});
} //compare_node_text

/// Sorting criterion for node text: by locale, descending, case-insensitive.
/// Limitations are as compare_node_text().
function compare_node_text_desc(a,b)
{
    return compare_node_text(b,a);
} //compare_node_text_desc

/// Sorting criterion for node text: numeric, by locale, ascending,
/// case-insensitive.
/// If either node is unknown to the tree, it is sorted later.  If both nodes
/// are unknown, they are sorted equally.  Numbers are sorted before
/// @param a {mixed} One node, in any form acceptable to jstree.get_node()
/// @param b {mixed} The other node, in any form acceptable to jstree.get_node()
/// @return {Number} -1, 0, or 1
function compare_node_num(a, b)
{
    let a_text = treeobj.get_text(a);
    let b_text = treeobj.get_text(b);

    if(a_text === b_text) return 0;     // e.g., both unknown
    if(a_text === false) return 1;      // only #a unknown - it sorts later
    if(b_text === false) return -1;     // only #b unknown - it sorts later

    let a_num = parseFloat(a_text);
    let b_num = parseFloat(b_text);

    if(isNaN(a_num) && !isNaN(b_num)) return 1;     // a text, b # => a later
    if(!isNaN(a_num) && isNaN(b_num)) return -1;    // b text, a # => b later

    if(isNaN(a_num) && isNaN(b_num))     // both are text
        return a_text.localeCompare(b_text, undefined, {sensitivity:'base'});

    // Finally!  Numeric comparison!
    if(a_num === b_num) return 0;
    return (a_num > b_num ? 1 : -1);
} //compare_node_num

/// Sorting criterion for node text: numeric, by locale, descending,
/// case-insensitive.  Limitations are as compare_node_num().
function compare_node_num_desc(a,b)
{
    return compare_node_num(b,a);
} //compare_node_num_desc

/// Get the textual version of raw_title for a window
function get_curr_raw_text(win_val)
{
    if(win_val.raw_title !== null) {
        return win_val.raw_title;
    } else if(win_val.keep) {
        return 'Saved tabs';
    } else {
        return 'Unsaved';
    }
} //get_curr_raw_text()

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
/// TODO Replace this with use of the jstree "types" plugin, which permits
/// changing a node's li_attr after node creation by changing the type
/// of that node.
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

    let win_node = treeobj.get_node(win_node_id);
    if(win_node===false) return;

    let tab_index=0;
    for(let tab_node_id of win_node.children) {
        let tab_val = mdTabs.by_node_id(tab_node_id);
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

// --- Vertical-scrolling support ---

// When scrolling, with the CSS I am using, actions do not scroll with the
// tree.  TODO figure out how to handle this more effectively.  Maybe
// float, now that we have an action group?

/// A scroll function to make sure the action-group divs stay
/// in the right place.  Inspired by
/// https://stackoverflow.com/a/16248243/2877364 by
/// https://stackoverflow.com/users/939547/jsarma
function vscroll_function()
{ //TODO make this a closure over a specific win, jq
    log.info('Updating V positions');
    $('.' + ACTION_GROUP_WIN_CLASS).each(function(idx, dom_elem) {
        let jq = $(dom_elem);
        jq.css('top',jq.parent().offset().top - $(window).scrollTop());
    });
} //vscroll_function

/// Set up the vscroll function to be called when appropriate.
/// @param win {DOM Window} window
/// @param jq {JQuery element} the jQuery element for the tree root
function install_vscroll_function(win, jq)
{
    $(win).scroll(vscroll_function);

    // We also have to reset the positions on tree redraw.  Ugly.
    jq.on('redraw.jstree', vscroll_function);
    jq.on('after_open.jstree', vscroll_function);
    jq.on('after_close.jstree', vscroll_function);
} //install_vscroll_function()

/// Set up a function to set the visibilities of the action buttons.
/// We can't do this with straight CSS because, in each row, the wholerow
/// div is a sibling, not a parent, of the icons, text, and action buttons.
/// Therefore, mousing over the action buttons when the <a> extends under
/// those buttons causes repeated mouseenter/mouseleave even within the
/// borders of the wholerow.
/// @param jq_tree {JQuery element} the jQuery element for the tree
function install_action_visibility_function(jq_tree)
{
    // The worker
    function impl(evt, evt_data) {
        if(typeof evt_data.node === 'undefined') return;
        if(typeof evt_data.evt === 'undefined') return;

        let node = evt_data.node;
        let node_rec = get_node_val(evt_data.node.id);
        if(node_rec.ty !== NT_WINDOW) return;

        let jq_elem = treeobj.get_node(node.id, true);

        // Hover/dehover are effectively aliases for mouseenter/mouseleave,
        // so check the actual Y position.  ** NOTE ** This assumes and
        // enforces a single-column layout.

        let jq_a = jq_elem.children('a');   // Use the anchor as a proxy for
                                            // the whole first row
        let wholerow_pageXY = jq_a.offset();
        let wholerow_ht = jq_a.outerHeight();

        let rel_y = evt_data.evt.pageY - wholerow_pageXY.top;
        let vis;
        if( (rel_y >= 0) && (rel_y < wholerow_ht)) {
            vis = 'visible';
        } else {
            vis = 'hidden';
        }

        jq_elem.children('.tf-action-group').css('visibility', vis);
        console.log(vis);
    } //impl

    //function hover(evt, data)   { return impl(evt, data, 'visible'); }
    //function dehover(evt, data) { return impl(evt, data, 'hidden'); }

    jq_tree.on('hover_node.jstree',   impl);
    jq_tree.on('dehover_node.jstree', impl);

    // Getting closer, but still occasionally leaves behind an extra, or 
    // fails to react to clicks on the action buttons.  I think I may just
    // need to write a plugin to wrap a div around the node itself, excluding
    // its children.  Then mouseenter/mouseleave would work.

} //install_action_visibility_function

//////////////////////////////////////////////////////////////////////////
// Saving //

/// Wrap up the save data with a magic header and the current version number
function makeSaveData(data)
{
    return { tabfern: 42, version: SAVE_DATA_AS_VERSION, tree: data };
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
    let root_node = treeobj.get_node($.jstree.root);    //from get_json() src
    if(!root_node || !root_node.children) return;

    let result = [];    // the data to be saved

    // Clean up the data
    for(let win_node_id of root_node.children) {
        let win_node = treeobj.get_node(win_node_id);

        // Don't save windows with no children
        if( (typeof(win_node.children) === 'undefined') ||
            (win_node.children.length === 0) ) {
            continue;
        }

        let win_val = mdWindows.by_node_id(win_node.id);
        if(!win_val) continue;

        // Don't save ephemeral windows unless we've been asked to.
        let is_ephemeral = win_val.isOpen && (win_val.keep==WIN_NOKEEP);
        if( is_ephemeral && !save_ephemeral_windows ) continue;

        let result_win = {};       // what will hold our data

        result_win.raw_title = win_val.raw_title;
        result_win.tabs = [];
        if(is_ephemeral) result_win.ephemeral = true;
            // Don't bother putting it in if we don't need it.

        // Stash the tabs.  No recursion at this time.
        if(win_node.children) {
            for(let tab_node_id of win_node.children) {
                let tab_val = mdTabs.by_node_id(tab_node_id);
                if(!tab_val) continue;

                let thistab = {};
                thistab.raw_title = tab_val.raw_title;
                thistab.raw_url = tab_val.raw_url;
                // TODO save favIconUrl?
                result_win.tabs.push(thistab);
            }
        }

        result.push(result_win);
    } //foreach window

    // Save it
    let to_save = {};
    to_save[STORAGE_KEY] = makeSaveData(result);
        // storage automatically does JSON.stringify
    chrome.storage.local.set(to_save,
        function() {
            if(typeof(chrome.runtime.lastError) === 'undefined') {
                if(typeof cbk === 'function') {
                    cbk(to_save[STORAGE_KEY]);
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

function actionRenameWindow(node_id, node, unused_action_id, unused_action_el)
{
    let win_val = mdWindows.by_node_id(node_id);
    if(!win_val) return;

    let win_name = window.prompt('Window name?', get_curr_raw_text(win_val));
    if(win_name === null) return;   // user cancelled

    win_val.raw_title = win_name;
    win_val.keep = WIN_KEEP;    // assume that a user who bothered to rename
                                // a node wants to keep it.

    treeobj.rename_node(node_id, Esc.escape(get_curr_raw_text(win_val)));

    if(win_val.isOpen) {
        treeobj.set_icon(node, 'visible-saved-window-icon');
    }

    vscroll_function();     // Not sure why this is necessary, but I saw a
                            // vposition glitch without it.
    saveTree();
} //actionRenameWindow()

/// Mark a window as NOKEEP but don't close it
function actionForgetWindow(node_id, node, unused_action_id, unused_action_el)
{
    let win_val = mdWindows.by_node_id(node_id);
    if(!win_val) return;

    win_val.keep = WIN_NOKEEP;
    if(win_val.raw_title !== null) {
        win_val.raw_title += ' (Unsaved)';
    }

    treeobj.rename_node(node_id, Esc.escape(get_curr_raw_text(win_val)));

    if(win_val.isOpen) {    // should always be true, but just in case...
        treeobj.set_icon(node, 'visible-window-icon');
    }

    saveTree();
} //actionForgetWindow()

/// Close a window, but don't delete its tree nodes.  Used for saving windows.
/// ** The caller must call saveTree() --- actionCloseWindow() does not.
function actionCloseWindow(node_id, node, unused_action_id, unused_action_el)
{
    let win_val = mdWindows.by_node_id(node_id);
    if(!win_val) return;
    let win = win_val.win;

    // Mark the tree node closed
    win_val.win = undefined;
        // Prevents winOnRemoved() from calling us to handle the removal!
    win_val.keep = WIN_KEEP;
    mdWindows.change_key(win_val, 'win_id', NONE);
        // Can't access by win_id, but can still access by node_id.

    // TODO winOnFocusChanged(NONE) ?

    // Close the window
    if(win_val.isOpen && win) {
        chrome.windows.remove(win.id, ignore_chrome_error);
        // Don't try to close an already-closed window.
        // Ignore exceptions - when we are called from winOnRemoved,
        // the window is already gone, so the remove() throws.
        // See https://stackoverflow.com/a/45871870/2877364 by cxw
    }

    win_val.isOpen = false;
    treeobj.rename_node(node_id, Esc.escape(get_curr_raw_text(win_val)));
        // text may have changed with isOpen

    treeobj.set_icon(node_id, true);    //default icon
    twiddleVisibleStyle(node, false);   // remove the visible style

    // Collapse the tree, if the user wants that
    if(getBoolSetting("collapse-tree-on-window-close")) {
        treeobj.close_node(node);
    }

    // Mark the tabs in the tree node closed.
    for(let tab_node_id of node.children) {
        let tab_val = mdTabs.by_node_id(tab_node_id);
        if(!tab_val) continue;

        tab_val.tab = undefined;
        tab_val.win_id = NONE;
        tab_val.index = NONE;
        tab_val.isOpen = false;
        mdTabs.change_key(tab_val, 'tab_id', NONE);
        // raw_url and raw_title are left alone
    }
} //actionCloseWindow

function actionDeleteWindow(node_id, node, unused_action_id, unused_action_el)
{
    // Close the window and adjust the tree
    actionCloseWindow(node_id, node, unused_action_id, unused_action_el);

    lastDeletedWindow = [];
    // Remove the tabs from mdTabs
    for(let tab_node_id of node.children) {
        let tab_val = mdTabs.by_node_id(tab_node_id);
        if(!tab_val) continue;
        mdTabs.remove_value(tab_val);
        // Save the URLs for "Restore last deleted"
        lastDeletedWindow.push(tab_val.raw_url);
    }

    // Remove the window's node and value
    let scrollOffsets = [window.scrollX, window.scrollY];
    treeobj.delete_node(node_id);   //also deletes child nodes
    window.scrollTo(...scrollOffsets);

    let win_val = mdWindows.by_node_id(node_id);
    mdWindows.remove_value(win_val);

    saveTree();
} //actionDeleteWindow

//////////////////////////////////////////////////////////////////////////
// Tree-node creation //

/// Create a tree node for an open tab.
/// @param tab {Chrome Tab} the tab record
function createNodeForTab(tab, parent_node_id)
{
    { //  debug
        let tab_val = mdTabs.by_tab_id(tab.id);
        if(tab_val) {
            log.error('About to create node for existing tab ' + tab.id);
        }
    } // /debug

    let node_data = {
          text: Esc.escape(tab.title)
        , icon: (tab.favIconUrl ? encodeURI(tab.favIconUrl) : 'fff-page')
    };
    // TODO if the favicon doesn't load, replace the icon with the generic
    // page icon so we don't keep hitting the favIconUrl.
    let tab_node_id = treeobj.create_node(parent_node_id, node_data);
    mdTabs.add({tab_id: tab.id, node_id: tab_node_id,
        win_id: tab.windowId, index: tab.index, tab: tab,
        raw_url: tab.url, raw_title: tab.title, isOpen: true
    });

    return tab_node_id;
} //createNodeForTab

/// Create a tree node for a closed tab
/// @param tab_data_v1      V1 save data for the tab
/// @param parent_node_id   The node id for a closed window
function createNodeForClosedTab(tab_data_v1, parent_node_id)
{
    let node_data = {
          text: Esc.escape(tab_data_v1.raw_title)
        , icon: 'fff-page'
    };
    let tab_node_id = treeobj.create_node(parent_node_id, node_data);

    mdTabs.add({tab_id: NONE, node_id: tab_node_id,
        win_id: NONE, index: NONE, tab: undefined, isOpen: false,
        raw_url: tab_data_v1.raw_url, raw_title: tab_data_v1.raw_title
    });

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
        callback: actionRenameWindow
    });

    treeobj.add_action(win_node_id, {
        id: 'closeWindow',
        class: 'fff-picture-delete action-margin right-top',
        text: '&nbsp;',
        grouped: true,
        callback: actionCloseWindow
    });

    treeobj.add_action(win_node_id, {
        id: 'deleteWindow',
        class: 'fff-cross action-margin right-top',
        text: '&nbsp;',
        grouped: true,
        callback: actionDeleteWindow
    });

} //addWindowNodeActions

/// Create a tree node for open, unsaved window #win.
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
            });

    log.info('Adding nodeid map for winid ' + win.id);
    let win_val = mdWindows.add({
        win_id: win.id, node_id: win_node_id, win: win,
        raw_title: null,    // default name
        isOpen: true, keep: keep
    });

    treeobj.rename_node(win_node_id, Esc.escape(get_curr_raw_text(win_val)));
    addWindowNodeActions(win_node_id);

    if(win.tabs) {                      // new windows may have no tabs
        for(let tab of win.tabs) {
            log.info('   ' + tab.id.toString() + ': ' + tab.title);
            createNodeForTab(tab, win_node_id);
        }
    }

    return win_node_id;
} //createNodeForWindow

/// Create a tree node for a closed window
/// @param win_data_v1      V1 save data for the window
function createNodeForClosedWindow(win_data_v1)
{
    let is_ephemeral = Boolean(win_data_v1.ephemeral);  // missing => false
    let shouldCollapse = getBoolSetting('collapse-trees-on-startup');

    log.info('Closed window ' + win_data_v1.raw_title + (is_ephemeral?' (ephemeral)':''));

    // Update the view
    let win_node_id = treeobj.create_node(null,
            {   text: 'Closed window'
                //, 'icon': 'visible-window-icon'   // use the default icon
                , li_attr: { class: WIN_CLASS }
                , state: { 'opened': !shouldCollapse }
            });

    // Mark recovered windows
    if(is_ephemeral) {
        treeobj.set_type(win_node_id, NTN_RECOVERED);
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

    let win_val = mdWindows.add({
        win_id: NONE, node_id: win_node_id,
        win: undefined,
        raw_title: new_title,
        isOpen: false,
        keep: WIN_KEEP  // even if it was ephemeral before
    });
    // TODO also highlight recovered tabs with a color

    treeobj.rename_node(win_node_id, Esc.escape(get_curr_raw_text(win_val)));

    addWindowNodeActions(win_node_id);

    if(win_data_v1.tabs) {
        for(let tab_data_v1 of win_data_v1.tabs) {
            //log.info('   ' + tab_data_v1.text);
            createNodeForClosedTab(tab_data_v1, win_node_id);
        }
    }

    return win_node_id;
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
    ///     A V1 win may optionally include { ephemeral:<truthy> } to mark
    ///     ephemeral windows.  The default for `ephemeral` is false.
    /// Each tab is {raw_title: "foo", raw_url: "bar"}
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
    chrome.storage.local.get(STORAGE_KEY, function(items) {

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

        } else if(STORAGE_KEY in items) {       // Chrome did load the data
            let parsed = items[STORAGE_KEY];    // auto JSON.parse
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
/// TODO break "open window" out into a separate function.
function treeOnSelect(_evt_unused, evt_data)
{
    //log.info(evt_data.node);
    if(typeof evt_data.node === 'undefined') return;

    let node = evt_data.node;
    let node_val, is_tab=false, is_win=false;

    let win_id;     // If assigned, this window will be brought to the front
                    // at the end of this function.

    if(node_val = mdTabs.by_node_id(node.id)) {
        is_tab = true;
    } else if(node_val = mdWindows.by_node_id(node.id)) {
        is_win = true;
    } else {
        log.error('Selection of unknown node '+node);
        return;     // unknown node type
    }

    if(treeobj.get_type(node) === NTN_RECOVERED) {
        treeobj.set_type(node, 'default');
    }

    // TODO figure out why this doesn't work: treeobj.deselect_node(node, true);
    treeobj.deselect_all(true);
        // Clear the selection.  True => no event due to this change.
    //log.info('Clearing flags treeonselect');
    treeobj.clear_flags(true);

    if(is_tab && node_val.isOpen) {   // An open tab
        chrome.tabs.highlight({
            windowId: node_val.win_id,
            tabs: [node_val.index]     // Jump to the clicked-on tab
        });
        //log.info('flagging treeonselect' + node.id);
        treeobj.flag_node(node);
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
            let parent_node = treeobj.get_node(parent_node_id);
            if(!parent_node) return;

            win_node = parent_node;
            win_val = mdWindows.by_node_id(parent_node_id);
            if(!win_val) return;
        }

        // Grab the URLs for all the tabs
        let urls=[];
        let expected_tab_count = win_node.children.length;
        for(let child_id of win_node.children) {
            let child_val = mdTabs.by_node_id(child_id);
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
                mdWindows.change_key(win_val, 'win_id', win.id);

                win_val.isOpen = true;
                win_val.keep = true;      // just in case
                win_val.win = win;
                treeobj.set_icon(win_node.id, 'visible-saved-window-icon');

                twiddleVisibleStyle(win_node, true);

                treeobj.open_node(win_node);

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
                    let tab_val = mdTabs.by_node_id(tab_node_id);
                    if(!tab_val) continue;

                    let tab = win.tabs[idx];

                    tab_val.win_id = win.id;
                    tab_val.index = idx;
                    tab_val.tab = tab;
                    tab_val.raw_url = tab.url || 'about:blank';
                    tab_val.raw_title = tab.title || '## Unknown title ##';
                    tab_val.isOpen = true;
                    mdTabs.change_key(tab_val, 'tab_id', tab_val.tab.id);
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
                            chrome.tabs.remove(to_prune, ignore_chrome_error);
                        } //endif we have extra tabs
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
            chrome.windows.update(win_id, {focused: true}, ignore_chrome_error);
        });
    }
} //treeOnSelect

//////////////////////////////////////////////////////////////////////////
// Chrome window/tab callbacks //

function winOnCreated(win)
{
    log.info('Window being created: ' + win.id +
            (window_is_being_restored ? " (restoring)" : "") );
    //log.info('clearing flags winoncreated');
    treeobj.clear_flags();
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
    vscroll_function();
    saveTree();     // for now, brute-force save on any change.
} //winOnCreated

/// Update the tree when the user closes a browser window
function winOnRemoved(win_id)
{
    if(win_id == my_winid) return;  // does this happen?

    // Stash the size of the window being closed as the size for
    // reopened windows.
    if(win_id in winSizes) {
        newWinSize = winSizes[win_id];
        delete winSizes[win_id];
    }

    let node_val = mdWindows.by_win_id(win_id);
    if(!node_val) return;   // e.g., already closed
    let node_id = node_val.node_id;
    if(!node_id) return;
    let node = treeobj.get_node(node_id);
    if(!node) return;

    winOnFocusChanged(NONE);        // Clear the highlights.

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
    vscroll_function();
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
        treeobj.clear_flags();
    }

    chrome.windows.getLastFocused({}, function(win){
        let new_win_id;
        if(!win.focused) {
            new_win_id = NONE;
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
        $('.' + WIN_CLASS + ' > a').removeClass(FOCUSED_WIN_CLASS);

        currently_focused_winid = new_win_id;

        if(new_win_id === NONE) return;

        // Get the window
        let window_node_id = mdWindows.by_win_id(new_win_id, 'node_id');
        //log.info('Window node ID: ' + window_node_id);
        if(!window_node_id) return;
            // E.g., if new_win_id corresponds to this view.

        // Make the window's entry bold, but no other entries.
        // This seems to need to run after a yield when dragging
        // tabs between windows, or else the FOCUSED_WIN_CLASS
        // doesn't seem to stick.

        // TODO change this to use flag_node instead.
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
    if(!win_node_id) return;

    let tab_node_id;

    // See if this is a duplicate of an existing tab
    let tab_val = mdTabs.by_tab_id(tab.id);

    if(tab_val === undefined) {     // If not, create the tab
        let tab_node_id = createNodeForTab(tab, win_node_id);   // Adds at end
        treeobj.move_node(tab_node_id, win_node_id, tab.index);
            // Put it in the right place
    } else {
        log.info('   - That tab already exists.');
        treeobj.move_node(tab_val.node_id, win_node_id, tab.index);
            // Just put it where it now belongs.
    }

    updateTabIndexValues(win_node_id);
    vscroll_function();
    saveTree();
} //tabOnCreated

function tabOnUpdated(tabid, changeinfo, tab)
{
    log.info('Tab updated: ' + tabid + ' (`changeinfo` and `tab` follow)');
    log.info(changeinfo);
    log.info(tab);

    let tab_node_val = mdTabs.by_tab_id(tabid);
    if(!tab_node_val) return;
    let tab_node_id = tab_node_val.node_id;

    let node = treeobj.get_node(tab_node_id);
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
    treeobj.rename_node(tab_node_id, Esc.escape(tab_node_val.raw_title));

    {   // set the icon
        let icon_text;
        if(changeinfo.favIconUrl) {
            icon_text = encodeURI(changeinfo.favIconUrl);
        } else if(tab.favIconUrl) {
            icon_text = encodeURI(tab.favIconUrl);
        } else {
            icon_text = 'fff-page';
        }
        treeobj.set_icon(tab_node_id, icon_text);
    }

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
    if(!window_node_id) return;

    // Get the tab's node
    let tab_node_id = mdTabs.by_tab_id(tabid, 'node_id');
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

    // Highlight the active tab
    SELTAB: {
        // Get the tab's node
        let tab_node_id = mdTabs.by_tab_id(activeinfo.tabId, 'node_id');
        if(!tab_node_id) break SELTAB;

        //log.info('Clearing flags tabonactivate');
        treeobj.clear_flags();
        //log.info('flagging ' +tab_node_id);
        treeobj.flag_node(tab_node_id);
    }

    // No need to save --- we don't save which tab is active.
} //tabOnActivated

/// Delete a tab's information when the user closes it.
function tabOnRemoved(tabid, removeinfo)
{
    log.info('Tab being removed: ' + tabid);
    log.info(removeinfo);

    // If the window is closing, do not remove the tab records.
    // The cleanup will be handled by winOnRemoved().
    if(removeinfo.isWindowClosing) return;

    let window_node_id = mdWindows.by_win_id(removeinfo.windowId, 'node_id');
    if(!window_node_id) return;

    {   // Keep the locals here out of the scope of the closure below.
        // Get the parent (window)
        let window_node = treeobj.get_node(window_node_id);
        if(!window_node) return;

        // Get the tab's node
        let tab_node_id = mdTabs.by_tab_id(tabid, 'node_id');
        if(!tab_node_id) return;
        let tab_node = treeobj.get_node(tab_node_id);
        if(!tab_node) return;

        // Remove the node
        let tab_val = mdTabs.by_tab_id(tabid);
        mdTabs.remove_value(tab_val);
            // So any events that are triggered won't try to look for a
            // nonexistent tab.
        treeobj.delete_node(tab_node);
    }

    // Refresh the tab.index values for the remaining tabs
    updateTabIndexValues(window_node_id);

    vscroll_function();
    saveTree();
} //tabOnRemoved

function tabOnDetached(tabid, detachinfo)
{
    // Don't save here?  Do we get a WindowCreated if the tab is not
    // attached to another window?
    log.info('Tab being detached: ' + tabid);
    log.info(detachinfo);

    treeobj.clear_flags();  //just to be on the safe side

    // Rather than stashing the tab's data, for now, just trash it and
    // re-create it when it lands in its new home.  This seems to work OK.
    // TODO change this so that we can preserve per-tab data.
    tabOnRemoved(tabid,
            {isWindowClosing: false, windowId: detachinfo.oldWindowId}
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

/// ID of a timer to save the new window size after a resize event
let resize_save_timer_id;

/// A cache of the last size we saved to disk
let last_saved_size;

/// Save #size_data as the size of our popup window
function saveViewSize(size_data)
{
    //log.info('Saving new size ' + size_data.toString());

    let to_save = {};
    to_save[LOCN_KEY] = size_data;
    chrome.storage.local.set(to_save,
            function() {
                log.info('Saving size: error=' + chrome.runtime.lastError);
                if(typeof(chrome.runtime.lastError) === 'undefined') {
                    last_saved_size = $.extend({}, size_data);
                } else {
                    log.error("TabFern: couldn't save location: " +
                                chrome.runtime.lastError.toString());
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
    setTimeout(timedResizeDetector, RESIZE_DETECTOR_INTERVAL_MS);
} //timedResizeDetector

//////////////////////////////////////////////////////////////////////////
// Hamburger menu //

/// Open a new window with a given URL.  Also remove the default
/// tab that appears because we are letting the window open at the
/// default size.  Yes, this is quite ugly.
function openWindowForURL(url)
{
    chrome.windows.create(
        function(win) {
            if(typeof(chrome.runtime.lastError) === 'undefined') {
                chrome.tabs.create({windowId: win.id, url: url},
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
} //openWindowForURL

/// Open a new window with the TabFern homepage.
function hamAboutWindow()
{
    openWindowForURL('https://cxw42.github.io/TabFern/');
} //hamAboutWindow()

/// Open the Settings window.  If ShowWhatIsNew, also updates the LASTVER_KEY
/// information used by checkWhatIsNew().
function hamSettings()
{
    // Actually open the window
    openWindowForURL(chrome.extension.getURL(
        '/src/options_custom/index.html' +
        (ShowWhatIsNew ? '#open=last' : ''))
    );

    // Record that the user has seen the "what's new" for this version
    if(ShowWhatIsNew) {
        ShowWhatIsNew = false;

        let to_save = {};
        to_save[LASTVER_KEY] = TABFERN_VERSION;
        chrome.storage.local.set(to_save, ignore_chrome_error);
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
        Fileops.Export(document, JSON.stringify(saved_info), filename);
    });
} //hamBackup()

/// Restore tabs from a saved backup.  Note that this adds the tabs to those
/// already present.  It does not delete existing tabs/windows.
function hamRestoreFromBackup()
{
    let importer = new Fileops.Importer(document, '.tabfern');
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
            let root = treeobj.get_node($.jstree.root);
            let node_id = root.children[root.children.length-1];
            treeobj.select_node(node_id);
        }
    }

    lastDeletedWindow = [];
} //hamRestoreLastDeleted

function hamExpandAll()
{
    treeobj.open_all();
} //hamExpandAll()

function hamCollapseAll()
{
    treeobj.close_all();
} //hamCollapseAll()

/// Make a function to sort the top-level nodes based on #compare_fn
function hamSorter(compare_fn)
{
    return function() {
        treeobj.get_node($.jstree.root).children.sort(compare_fn);
        treeobj.redraw(true);   // true => full redraw
    };
} //hamSorter

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
function getHamburgerMenuItems(node, UNUSED_proxyfunc, e)
{
    let items = {};
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
            action: hamBackup
        };
    items.restoreItem = {
            label: "Load contents of a backup",
            action: hamRestoreFromBackup,
            icon: 'fa fa-folder-open-o',
            separator_after: true
        };

    items.sortItem = {
            label: 'Sort',
            submenu: {
                azItem: {
                    label: 'A-Z',
                    title: 'Sort ascending by window name, case-insensitive',
                    action: hamSorter(compare_node_text)
                }
                , zaItem: {
                    label: 'Z-A',
                    title: 'Sort descending by window name, case-insensitive',
                    action: hamSorter(compare_node_text_desc)
                }
                , numItem09: {
                    label: '0-9',
                    title: 'Sort ascending by window name, numeric, case-insensitive',
                    action: hamSorter(compare_node_num)
                }
                , numItem90: {
                    label: '9-0',
                    title: 'Sort descending by window name, numeric, case-insensitive',
                    action: hamSorter(compare_node_num_desc)
                }
            } //submenu
        }; //sortItem

    items.expandItem = {
            label: "Expand all",
            icon: 'fa fa-plus-square',
            action: hamExpandAll
        };
    items.collapseItem = {
            label: "Collapse all",
            icon: 'fa fa-minus-square',
            action: hamCollapseAll
        };

    return items;
} //getHamburgerMenuItems()

//////////////////////////////////////////////////////////////////////////
// Context menu for the main tree

function getMainContextMenuItems(node, UNUSED_proxyfunc, e)
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
        win_val = mdWindows.by_node_id(node.id);
        if(win_val) nodeType = NT_WINDOW;
    }

    if(!nodeType) {
        tab_val = mdTabs.by_node_id(node.id);
        if(tab_val) nodeType = NT_TAB;
    }

    if(!nodeType) return false;     // A node type we don't know about

    // -------

    if(nodeType === NT_TAB) return false;    // At present, no menu for tabs

    if(nodeType === NT_WINDOW) {
        let winItems = {};
        winItems.renameItem = {
                label: 'Rename',
                icon: 'fff-pencil',
                action:
                    function(){actionRenameWindow(node.id, node, null, null);}
            };

        if( win_val.isOpen && (win_val.keep == WIN_KEEP) ) {
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
    } //endif NT_WINDOW

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
function dndIsDraggable(nodes, evt)
{
    if(log.getLevel() <= log.levels.TRACE) {
        console.group('is draggable?');
        console.log(nodes);
        console.groupEnd();
        //console.log($.jstree.reference(evt.target));
    }

    // If any node being dragged is anything other than a window,
    // it's not draggable.  Check all nodes for future-proofing, since we
    // may someday support multiselect.
    for(let node of nodes) {
        let val = get_node_val(node.id);
        if(val.ty !== NT_WINDOW) return false;
    }

    return true;    // Otherwise, it is draggable
} //dndIsDraggable

/// Determine whether a node is a valid drop target.
/// This function actually gets called for all changes to the tree,
/// so we permit everything except for invalid drops.
function treeCheckCallback(
            operation, node, node_parent, node_position, more)
{
    if(log.getLevel() <= log.levels.TRACE) {
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
    }

    // When dragging, you can't drag into another node, or anywhere but the root.
    if(more && more.dnd && operation==='move_node') {

        // Can't drop inside - only before or after
        if(more.pos==='i') return false;

        // Can't drop other than in the root
        if(node_parent.id !== $.jstree.root) return false;
    }

    // When moving, e.g., at drag end, you can't drop a window other than
    // in the root.
    if(operation==='move_node') {
        let val = get_node_val(node.id);

        if(log.getLevel() <= log.levels.TRACE) {
            console.group('check callback for ' + operation);
            console.log(val);
            console.log(node);
            console.log(node_parent);
            if(more) console.log(more);
            console.groupEnd();
        }

        if(val.ty === NT_WINDOW && node_parent.id !== $.jstree.root)
            return false;
    }

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
/// Function hamSettings() updates the LASTVER_KEY information.
function checkWhatIsNew(selector)
{
    chrome.storage.local.get(LASTVER_KEY, function(items) {
        let should_notify = true;   // unless proven otherwise

        // Check whether the user has seen the notification
        if(typeof(chrome.runtime.lastError) === 'undefined') {
            let lastver = items[LASTVER_KEY];
            if( (lastver !== null) && (typeof lastver === 'string') ) {
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
    });
} //checkWhatIsNew

//////////////////////////////////////////////////////////////////////////
// Startup / shutdown //

/// Did initialization complete successfully?
let did_init_complete = false;

// This is done in vaguely continuation-passing style.  TODO make it cleaner.
// Maybe use promises?

/// The last function to be called after all other initialization has
/// completed successfully.
function initTreeFinal()
{
    if(!was_loading_error) {
        did_init_complete = true;
        // Assume the document is loaded by this point.
        $(INIT_MSG_SEL).css('display','none');    // just in case
    }
} //initTreeFinal()

function initTree4(items)
{   // move the popup window to its last position/size.
    // If there was an error (e.g., nonexistent key), just
    // accept the default size.

    if(typeof(chrome.runtime.lastError) === 'undefined') {
        let parsed = items[LOCN_KEY];
        if( (parsed !== null) && (typeof parsed === 'object') ) {
            // + and || are to provide some sensible defaults - thanks to
            // https://stackoverflow.com/a/7540412/2877364 by
            // https://stackoverflow.com/users/113716/user113716
            let size_data =
                {
                      'left': +parsed.left || 0
                    , 'top': +parsed.top || 0
                    , 'width': +parsed.width || 300
                    , 'height': +parsed.height || 600
                };
            last_saved_size = $.extend({}, size_data);
            chrome.windows.update(my_winid, size_data);
        }
    } //endif no error

    // Start the detection of moved or resized windows
    setTimeout(timedResizeDetector, RESIZE_DETECTOR_INTERVAL_MS);

    initTreeFinal();
} //initTree4()

function initTree3()
{
    // Set event listeners
    treeobj.element.on('changed.jstree', treeOnSelect);

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

/// See whether a window corresponds to an already-saved, closed window.
/// This may happen, e.g., due to TabFern refresh or Chrome reload.
/// @return the existing window's node and value, or false if no match.
function winAlreadyExists(new_win)
{
    WIN:
    for(let existing_win_node_id of treeobj.get_node($.jstree.root).children) {

        // Is it already open?  If so, don't hijack it.
        let existing_win_val = mdWindows.by_node_id(existing_win_node_id);
        if(existing_win_val.isOpen) continue WIN;

        // Does it have the same number of tabs?  If not, skip it.
        let existing_win_node = treeobj.get_node(existing_win_node_id);
        if(existing_win_node.children.length != new_win.tabs.length)
            continue WIN;

        // Same number of tabs.  Are they the same URLs?
        for(let i=0; i<new_win.tabs.length; ++i) {
            let existing_tab_val = mdTabs.by_node_id(existing_win_node.children[i]);
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
            createNodeForWindow(win, WIN_NOKEEP);
        } else {
            log.info('Found existing window in the tree: ' + existing_win.val.raw_title);
            mdWindows.change_key(existing_win.val, 'win_id', win.id);
            existing_win.val.isOpen = true;
            // don't change val.keep, which may have either value.
            existing_win.val.win = win;
            twiddleVisibleStyle(existing_win.node, true);
            treeobj.set_icon(existing_win.node,
                    existing_win.val.keep ? 'visible-saved-window-icon' :
                                            'visible-window-icon' );
            treeobj.open_node(existing_win.node);

            // If we reach here, win.tabs.length === existing_win.node.children.length.
            for(let idx=0; idx < win.tabs.length; ++idx) {
                let tab_node_id = existing_win.node.children[idx];
                let tab_val = mdTabs.by_node_id(tab_node_id);
                if(!tab_val) continue;

                let tab = win.tabs[idx];

                tab_val.win_id = win.id;
                tab_val.index = idx;
                tab_val.tab = tab;
                tab_val.raw_url = tab.url || 'about:blank';
                tab_val.raw_title = tab.title || '## Unknown title ##';
                tab_val.isOpen = true;
                mdTabs.change_key(tab_val, 'tab_id', tab_val.tab.id);
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

    log.info('TabFern view.js initializing tree in window ' + win_id.toString());

    // Node types - use constants as the keys
    let jstreeTypes = {};
    jstreeTypes[NTN_RECOVERED] = {
        li_attr: { class: CLASS_RECOVERED }
    };

    // The main config
    let jstreeConfig = {
        plugins: ['actions', 'wholerow', 'flagnode',
                    'dnd', 'types'] // TODO add state plugin
        , core: {
            animation: false,
            multiple: false,          // for now
            check_callback: treeCheckCallback,
            themes: {
                name: 'default-dark'
              , variant: 'small'
            }
        }
        , state: {
            key: 'tabfern-jstree'
        }
        , flagnode: {
            css_class: 'tf-focused-tab'
        }
        , dnd: {
            copy: false,
            drag_selection: false,  // only drag one node
            is_draggable: dndIsDraggable,
            large_drop_target: true
            //, use_html5: true
            //, check_while_dragging: false   // For debugging only
        }
        , types: jstreeTypes
    };

    // Note on dnd.use_html5: When it's set, if you drag a non-draggable item,
    // it seems to treat the drag as if you were dragging the last node
    // you successfully dragged.
    // The effect of this is that, e.g., after dragging a window, dragging
    // one of its children moves the whole window.  TODO report this upstream.


    if ( getBoolSetting('ContextMenu.Enabled', true) ) {
        jstreeConfig.plugins.push('contextmenu');
        jstreeConfig.contextmenu = {
            items: getMainContextMenuItems
        };
        $.jstree.defaults.contextmenu.select_node = false;
        $.jstree.defaults.contextmenu.show_at_node = false;
    }

    // Create the tree
    let jq_tree = $('#maintree');
    jq_tree.jstree(jstreeConfig);
    treeobj = jq_tree.jstree(true);

    install_vscroll_function(window, jq_tree);

    install_action_visibility_function(jq_tree);

    // --------

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
                //window._tabFernContextMenu.installEventHandler(window, document, null);
                Bypasser = ContextMenuBypasser.create(window, treeobj);

                // Continue initialization by loading the tree
                loadSavedWindowsIntoTree(initTree2);

            } else {
                Shortcuts = window._tabFernShortcuts;
                //window._tabFernContextMenu.installEventHandler(window, document, window._tabFernShortcuts);
                Bypasser = ContextMenuBypasser.create(window, treeobj, Shortcuts);

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

    Hamburger = HamburgerMenuMaker('#hamburger-menu', getHamburgerMenuItems);

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

    // Get our Chrome-extensions-API window ID from the background page.
    // I don't know a way to get this directly from the JS window object.
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
        $(INIT_MSG_SEL).css('display','block');
    }
} //initIncompleteWarning()

//////////////////////////////////////////////////////////////////////////
// MAIN //

// Timer to display the warning message if initialization doesn't complete
// quickly enough.
window.setTimeout(initIncompleteWarning, INIT_TIME_ALLOWED_MS);

// Main events
window.addEventListener('load', initTree0, { 'once': true });
window.addEventListener('unload', shutdownTree, { 'once': true });
window.addEventListener('resize', eventOnResize);
    // This doesn't detect window movement without a resize, which is why
    // we have timedResizeDetector above.

//TODO test what happens when Chrome exits.  Does the background page need to
//save anything?

// Notes:
// can get treeobj from $(selector).data('jstree')
// can get element from treeobj.element

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
