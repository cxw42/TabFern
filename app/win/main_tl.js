// win/main_tl.js: main script for main.html in the popup window of TabFern
// (static/win/main.html).
// Copyright (c) cxw42, 2017--2019
// See /doc/design.md for information about notation and organization.

// TODO: fix all move_node calls for partly-open windows

// TODO: dnd - when rearranging tabs in a partly-open window, the positions
// get off.  I think when dropping from before a closed tab to after a
// closed tab.

// maybe todo: option, true by default, to only open tree for collapsed,
// closed window.

// TODO break more of this into separate modules.

console.log(
    `=============================================================
Loading TabFern ${TABFERN_VERSION} from ${__filename}
    manifest ver ${chrome.runtime.getManifest().version}
    manifest ver_name ${chrome.runtime.getManifest().version_name}`
);

//////////////////////////////////////////////////////////////////////////
// Modules // {{{1

// Hacks so I can keep everything in the global scope for ease of
// use or inspection in the console while developing.
// Note: globals are `var`, rather than `let`, so they can be accessed on
// `window` from the developer console.  `let` variables are not attached
// to the global object.

/// External modules
var Modules = require("win/main_deps");
var $ = require("jquery");

/// HACK - a global for loglevel (typing `Modules.log` everywhere is a pain).
var log;

// Shorthands for easier access
var K; ///< Constants loaded from view/const.js, for ease of access
var D; ///< Shorthand access to the details, view/item_details.js
var T; ///< Shorthand access to the tree, view/item_tree.js ("Tree")
var M; ///< Shorthand access to the model, view/model.js
var ASQ; ///< Shorthand for asynquence
var ASQH; ///< Shorthand for asq-helpers
var L; ///< Holder --- L.log === log.  This gives closures access to the
///< current log instance.
var S; ///< Setting definitions

////////////////////////////////////////////////////////////////////////// }}}1
// Globals // {{{1

/// The URL for new tabs we create
const NEW_TAB_URL = chrome.runtime.getURL("/win/new_tab.html");

// - Operation state -
var my_winid; ///< window ID of this popup window

/// HACK to avoid creating extra tree items.
/// TODO? change this to an object with win node ID's as keys.  Use one of the
/// tabs to carry the node ID for confirmation.
var window_is_being_restored = false;

/// The size of the last-closed window, to be used as the
/// size of newly-opened windows (whence the name).
/// Should always have a valid value.
var newWinSize = { left: 0, top: 0, width: 300, height: 600 };

/// The sizes of the currently-open windows, for use in setting #newWinSize.
/// The size of this popup, and other non-normal windows, is not tracked here.
var winSizes = {};

// TODO? use content scripts to catch window resizing, a la
// https://stackoverflow.com/q/13141072/2877364

/// Whether to show a notification of new features
var ShowWhatIsNew = false;

/// Array of URLs of the last-deleted window
var lastDeletedWindow;

/// Node ID of the last-closed saved window --- merging is prohibited with
/// this node.  It's the last-closed saved and not the last-closed overall
/// because nodes for unsaved windows disappear with their windows.
var lastSavedClosedWindow_node_id = undefined;

/// Did initialization complete successfully?
var did_init_complete = false;

/// Are we running in development mode (unpacked)?
var is_devel_mode = false;

// - Module instances -

/// The hamburger menu
var Hamburger;

/// The module that handles <Shift> bypassing of the jstree context menu
var Bypasser;

////////////////////////////////////////////////////////////////////////// }}}1
// Module setup, and utilities // {{{1

// Initialization support
let init_step_num = 0;
const LAST_INIT_STEP = 13;

/// Update the initialization status counter
let next_init_step = function (where) {
    ++init_step_num;

    let msg = `${init_step_num}/${LAST_INIT_STEP}${where ? ": " + where : ""}`;
    log.info({ Initialization: msg });

    let elem = $(K.INIT_PROGRESS_SEL);
    if (elem.css("display") !== "block") return;

    elem.text(msg);

    elem.hide().show(1);
    // Force redraw - thanks to
    // https://stackoverflow.com/users/122543/juank and
    // https://stackoverflow.com/users/402517/l-poellabauer
    // at https://stackoverflow.com/a/8840703/2877364 .
    // I used (1) instead of (0) since I saw it not work once with (0).
}; //next_init_step()

/// Tell me if I forgot to update LAST_INIT_STEP
let check_init_step_count = function () {
    if (init_step_num !== LAST_INIT_STEP) {
        let msg = `Step count was ${init_step_num} - update LAST_INIT_STEP`;
        log.warn(msg);
        window.alert(msg);
    }
}; //check_init_step_count()

/// Init those of our globals that don't require any data to be loaded.
/// Call after Modules has been populated.
function local_init() {
    L = {};
    L.log = log = Modules.loglevel;
    log.setDefaultLevel(log.levels.WARN);

    K = Modules.K;
    D = Modules.D;
    T = Modules.T;
    M = Modules.M;
    ASQ = Modules.ASQ;
    ASQH = Modules.ASQH;
    S = Modules.S;
} //local_init()

/// Copy properties named #property_names from #source to #dest.
/// If #modifier is provided, it is applied to each property value before assigning.
/// @return A copy of dest, or null
function copyTruthyProperties(dest, source, property_names, modifier) {
    if (!dest || !source || !property_names) return null;
    if (!Array.isArray(property_names)) property_names = [property_names];
    if (!modifier || typeof modifier !== "function")
        modifier = (x) => {
            return x;
        };

    for (let key of property_names) {
        if (source[key]) dest[key] = modifier(source[key]);
    }
    return dest;
} //copyTruthyProperties()

/// Escape text for use in a regex.  By Mozilla Contributors (CC-BY-SA 2.5+), from
/// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
} //escapeRegExp()

/// Get the node ID from a NEW_TAB_URL.  Returns falsy on failure, or the ID
/// on success.
function getNewTabNodeId(ctab) {
    if (!ctab || !(ctab.url || ctab.pendingUrl)) return false;
    let hash;
    try {
        let url = new URL(ctab.url || ctab.pendingUrl);
        // Since Chrome 79, we get url == "" and pendingUrl != "" in onTabCreated
        if (!url.hash) return false;

        hash = url.hash.slice(1);
        if (!hash) return false;

        if (url.href.split("#")[0] !== NEW_TAB_URL) {
            return false;
        }
    } catch (e) {
        log.info({
            [`onTabCreated handle_tabfern_action exception: ${e}`]: ctab,
        });
        return false;
    }

    return hash;
} //getNewTabNodeId()

////////////////////////////////////////////////////////////////////////// }}}1
// General record helpers // {{{1

/// Get the geometry (size, position, and state) of a window, as an object
/// @param win {DOM window} The window
function getWindowGeometry(win) {
    return {
        left: win.screenLeft || 0,
        top: win.screenTop || 0,
        width: win.outerWidth || 300,
        height: win.outerHeight || 600,
        winState: "normal",
        // assume normal since we don't implement the full Page Visibility API
    };
} //getWindowGeometry()

/// Get the geometry of a window, as an object, from a Chrome window record.
/// See comments in getWindowGeometry().
/// @param cwin {Chrome Window} The window record
function getCWinGeometry(cwin) {
    return {
        left: cwin.left || 0,
        top: cwin.top || 0,
        width: cwin.width || 300,
        height: cwin.height || 600,
        winState: cwin.state || "normal",
    };
} //getCWinGeometry()

/// Clear flags on all windows; leave tabs alone.
function unflagAllWindows() {
    T.treeobj.clear_flags_by_multitype(
        [K.IT_WIN, K.NST_OPEN],
        undefined, // any parent
        true // true => don't need an event
    );
} //unflagAllWindows()

////////////////////////////////////////////////////////////////////////// }}}1
// UI Controls // {{{1

/// Show a confirmation dialog with Yes/No/Cancel, and Do not ask again.
/// @param message_html {String} the HTML message to show.  The caller is
/// responsible for sanitizing the message.
/// @param show_dnsa {Boolean} If true (default), show the "Don't show again"
/// checkbox.  Otherwise, hide the box.
/// @return An ASQ instance that will run once the dialog closes
function showConfirmationModalDialog(message_html, show_dnsa = true) {
    let dlg; ///< The rmodal instance
    let retval = ASQ(); ///< caller's processing after dlg closes
    let cleanup = ASQ(); ///< our internal cleanup after dlg closes

    let cbk = retval.errfcb(); // pause the sequence
    let cleanup_cbk = cleanup.errfcb(); // pause the sequence

    // Modified from the rmodal sample at https://rmodal.js.org/
    let jqdlg = $("#confirm-dialog");
    jqdlg.find("#confirm-dialog-question").html(message_html);

    // i18n
    const KEY_YES = _T("dlgYesAccelerator");
    const KEY_NO = _T("dlgNoAccelerator");
    const KEY_CANCEL = _T("dlgCancelAccelerator");

    jqdlg
        .find("#confirm-dialog-yes")
        .attr("accesskey", KEY_YES)
        .html(_T("dlgYesHTML"));
    jqdlg
        .find("#confirm-dialog-no")
        .attr("accesskey", KEY_NO)
        .html(_T("dlgNoHTML"));
    jqdlg
        .find("#confirm-dialog-cancel")
        .attr("accesskey", KEY_CANCEL)
        .html(_T("dlgCancelHTML"));
    jqdlg.find("#notAgain").toggle(show_dnsa).prop("disabled", !show_dnsa);

    if (show_dnsa) {
        jqdlg.find("#labelNotAgain").html(_T("dlgDoNotAskAgainHTML"));
    }

    dlg = new Modules.rmodal(document.getElementById("confirm-dialog"), {
        closeTimeout: 0,

        afterOpen: function () {
            $("#confirm-dialog .btn-primary").focus();
        },

        afterClose: function () {
            cleanup_cbk(null); // Run the cleanup
            let data = { reason: dlg.reason };
            if (show_dnsa) {
                data.notAgain = dlg.notAgain;
            }
            cbk(null, data);
            // In parallel, let the caller's processing run
        },
    });

    dlg.reason = null; // to store which button is pressed
    dlg.notAgain = false; // to store the "not again" checkbox

    // Add the button listeners, to avoid inline scripts
    $("#confirm-dialog button").on("click.TFrmodal", function () {
        dlg.reason = this.dataset.which;
        dlg.close();
    });

    // The "don't ask again" checkbox
    let notAgain;
    if (show_dnsa) {
        notAgain = $("#cbNotAgain");
        notAgain[0].checked = false;
        notAgain.on("change.TFrmodal", function () {
            dlg.notAgain = this.checked;
        });
    }

    // Add the keyboard listener
    $(document).on("keydown.TFrmodal", function (ev) {
        let key =
            ev && typeof ev.key === "string" ? ev.key.toLowerCase() : null;

        // Send the events on the next cycle (not sure if the delay is required)
        if (key === KEY_YES) {
            ASQ().val(() => {
                $("#confirm-dialog .btn[data-which='yes']").click();
            });
        } else if (key === KEY_NO) {
            ASQ().val(() => {
                $("#confirm-dialog .btn[data-which='no']").click();
            });
        } else if (key === KEY_CANCEL) {
            ASQ().val(() => {
                $("#confirm-dialog .btn[data-which='cancel']").click();
            });
        } else {
            dlg.keydown(ev);
        }
    }); //keydown

    // Cleanup code
    cleanup.val(() => {
        try {
            $(document).off("keydown.TFrmodal");
            if (show_dnsa && notAgain) {
                notAgain.off("change.TFrmodal");
            }
            $("#confirm-dialog .modal-footer button").off("click.TFrmodal");
        } catch (e) {
            log.info({ "dialog cleanup exception": e });
        }
    }); //end cleanup code

    // On the next cycle, open the dialog.
    ASQ().val(() => {
        dlg.open();
    });

    return retval;
} // showConfirmationModalDialog()

////////////////////////////////////////////////////////////////////////// }}}1
// Saving // {{{1

/// Wrap up the save data with a magic header and the current version number
function makeSaveData(data) {
    return { tabfern: 42, version: K.SAVE_DATA_AS_VERSION, tree: data };
} //makeSaveData()

/// Save the tree to Chrome local storage as **V1** save data.
/// @param save_ephemeral_windows {Boolean}
///     whether to save information for open, unsaved windows (default true)
/// @param cbk {function}
///     If provided, will be called after saving completes.
///     Called as cbk(err, save_data).  On success, err is null.
function saveTree(save_ephemeral_windows = true, cbk = undefined) {
    if (log.getLevel <= log.levels.TRACE) console.log("saveTree");

    // Get the raw data for the whole tree.  Can't use $(...) because closed
    // tree nodes aren't in the DOM.
    let root_node = T.root_node();
    if (!root_node || !root_node.children) {
        if (typeof cbk === "function") cbk(new Error("Can't get root node"));
        return;
    }

    let result = []; // the data to be saved

    // Clean up the data
    for (let win_node_id of root_node.children) {
        let win_node = T.treeobj.get_node(win_node_id);

        // Don't save windows with no children
        if (
            typeof win_node.children === "undefined" ||
            win_node.children.length === 0
        ) {
            continue;
        }

        let win_val = D.windows.by_node_id(win_node.id);
        if (!win_val) continue;

        // Don't save ephemeral windows unless we've been asked to.
        let is_ephemeral = win_val.isOpen && win_val.keep === K.WIN_NOKEEP;
        if (is_ephemeral && !save_ephemeral_windows) continue;

        let result_win = {}; // what will hold our data

        result_win.raw_title = win_val.raw_title;
        result_win.tabs = [];
        result_win.ordered_url_hash = win_val.ordered_url_hash || undefined;
        if (is_ephemeral) result_win.ephemeral = true;
        // Don't bother putting it in if we don't need it.

        // Stash the tabs.  No recursion at this time.
        if (win_node.children) {
            for (let tab_node_id of win_node.children) {
                let tab_val = D.tabs.by_node_id(tab_node_id);
                if (!tab_val) continue;

                let thistab_v1 = {}; ///< the V1 save data for the tab
                thistab_v1.raw_title = tab_val.raw_title;
                thistab_v1.raw_url = tab_val.raw_url;

                copyTruthyProperties(thistab_v1, tab_val, [
                    "raw_favicon_url",
                    "isPinned",
                    "raw_bullet",
                ]);

                if (M.has_subtype(tab_node_id, K.NST_TOP_BORDER)) {
                    thistab_v1.bordered = true;
                }

                result_win.tabs.push(thistab_v1);
            } //foreach tab_node_id
        } //endif window has child tabs

        result.push(result_win);
    } //foreach window

    // Save it
    let to_save = {};
    to_save[K.STORAGE_KEY] = makeSaveData(result);
    // storage automatically does JSON.stringify
    chrome.storage.local.set(to_save, function () {
        if (!isLastError()) {
            log.debug("Saved tree");
            if (typeof cbk === "function") {
                cbk(null, to_save[K.STORAGE_KEY]);
            }
            return; // Saved OK
        }
        //else there was an error
        let msg = _T("errCouldNotSave", lastBrowserErrorMessageString());
        log.error(msg);
        window.alert(msg); // The user needs to know
        if (typeof cbk === "function") cbk(new Error(msg));
    }); //storage.local.set
} //saveTree()

////////////////////////////////////////////////////////////////////////// }}}1
// Other actions // {{{1

/// Make a string replacement on the URLs of all the tabs in a window
/// @param node_id {string} the ID of the window's node
/// @param node {Object} the window's node
function actionURLSubstitute(
    node_id,
    node,
    unused_action_id,
    unused_action_el
) {
    let win_val = D.windows.by_node_id(node_id);
    if (!win_val) return;

    // TODO replace window.prompt with an in-DOM GUI.
    let old_text = window.prompt(_T("dlgpTextToReplace"));
    if (old_text === null) return; // user cancelled

    let new_text = window.prompt(_T("dlgpReplacementText"), old_text);
    if (new_text === null) return; // user cancelled

    if (!old_text) return; // search pattern is required

    // TODO URL escaping of new_text?

    let findregex;
    if (
        old_text.length > 1 &&
        old_text[0] === "/" &&
        old_text[old_text.length - 1] === "/"
    ) {
        // Regex
        findregex = new RegExp(old_text.slice(1, -1)); // drop the slashes
        // TODO support flags as well
    } else {
        // Literal
        findregex = new RegExp(escapeRegExp(old_text));
    }

    for (let tab_node_id of node.children) {
        let tab_val = D.tabs.by_node_id(tab_node_id);
        if (!tab_val || !tab_val.tab_id) continue;
        let new_url = tab_val.raw_url.replace(findregex, new_text);
        // TODO URL escaping?
        // TODO also replace in favicon URL?
        if (new_url === tab_val.raw_url) continue;

        if (win_val.isOpen) {
            // Make the change and let onTabUpdated update the model.
            ASQH.NowCC((cc) => {
                // ASQ for error reporting
                chrome.tabs.update(tab_val.tab_id, { url: new_url }, cc);
            });
        } else {
            tab_val.raw_url = new_url;
            M.refresh(tab_val);
        }
    } // foreach child

    // If the window is closed, update the hash.  Otherwise, onTabUpdated()
    // handled it.
    if (!win_val.isOpen) {
        M.updateOrderedURLHash(win_val);
    }

    // Since the user touched the window, save the changes.
    actionRememberWindow(node_id, node);
} //actionURLSubstitute()

////////////////////////////////////////////////////////////////////////// }}}1
// jstree helpers {{{1

/// Collapse a tree node.
function collapseTreeNode(nodey) {
    T.treeobj.close_node(nodey);
    T.install_rjustify(null, "redraw_event.jstree", "once");
    T.treeobj.redraw_node(nodey); // to be safe
} //collapseTreeNode()

// }}}1
// jstree-action callbacks (handle user clicks on the tree icons) // {{{1

/// Wrapper to call jstree-action style callbacks from jstree contextmenu
/// actions
function actionAsContextMenuCallback(action_function) {
    return function (data) {
        // data.item, reference, element, position exist
        let node = T.treeobj.get_node(data.reference);
        action_function(node.id, node, null, data.element);
    };
} //actionAsContextMenuCallback()

/// chrome.windows.get() callback to flag the current tab in a window.
/// Helper for actionOpenRestOfTabs(), onTreeSelect() and onWinFocusChanged().
function flagOnlyCurrentTab(cwin) {
    let win_node_id = D.windows.by_win_id(cwin.id, "node_id");
    let win_node = T.treeobj.get_node(win_node_id);
    if (!win_node) return;

    // Clear the highlights of the tabs
    T.treeobj.flag_node(win_node.children, false);

    // Flag the current tab
    for (let ctab of cwin.tabs) {
        if (ctab.active) {
            let tab_node_id = D.tabs.by_tab_id(ctab.id, "node_id");
            if (tab_node_id) T.treeobj.flag_node(tab_node_id);
            break;
        }
    } //foreach ctab
} //flagOnlyCurrentTab()

// Chrome callback version of flagOnlyCurrentTab().
function flagOnlyCurrentTabCC(cwin) {
    if (!isLastError()) {
        flagOnlyCurrentTab(cwin);
    } else {
        log.info({ "Couldn't flag": lastBrowserErrorMessageString() });
    }
} //flagOnlyCurrentTabCC()

// == Window actions ===================================================== {{{2

/// Prompt the user for a new name for a window, and rename if the user
/// hits OK.
function actionRenameWindow(node_id, node, unused_action_id, unused_action_el) {
    let win_val = D.windows.by_node_id(node_id);
    if (!win_val) return;

    // TODO replace window.prompt with an in-DOM GUI.
    let win_name = window.prompt(
        _T("dlgpNewWindowName"),
        M.remove_unsaved_markers(M.get_raw_text(win_val))
    );
    if (win_name === null) return; // user cancelled

    // A bit of a hack --- if the user hits OK on the default text for a
    // no-name window, change it to "Saved tabs."  TODO find a better way.
    if (win_name === _T("labelUnsaved") || win_name === "") {
        win_val.raw_title = _T("labelSavedTabs");
    } else {
        win_val.raw_title = win_name;
    }

    M.remember(node_id, false); // calls refresh_label internally.
    // Assume that a user who bothered to rename a node
    // wants to keep it.  false => do not change the raw_title,
    // since the user just specified it.

    M.del_subtype(node_id, K.NST_RECOVERED);
    // The user has touched the window, so doesn't need the "recovered"
    // reminder.

    saveTree();
} //actionRenameWindow()

/// Mark a window as K.NOKEEP but don't close it
function actionForgetWindow(node_id, node, unused_action_id, unused_action_el) {
    let win_val = D.windows.by_node_id(node_id);
    if (!win_val) return;

    // Refuse to forget a partly-open window since doing so silently
    // removes the memory of closed tabs in that window.
    if (M.isWinPartlyOpen(win_val)) {
        return;
    }

    M.mark_win_as_unsaved(win_val);

    if (win_val.isOpen) {
        // should always be true, but just in case...
        M.del_subtype(node_id, K.NST_SAVED);
        M.add_subtype(node_id, K.NST_OPEN);
    }

    saveTree();
} //actionForgetWindow()

/// Mark a window as K.KEEP but don't close it
function actionRememberWindow(
    node_id,
    node,
    unused_action_id,
    unused_action_el
) {
    M.remember(node_id); // No-op if node_id isn't a window

    saveTree();
} //actionRememberWindow()

/// Close a window, but don't delete its tree nodes.  Used for saving windows.
/// ** The caller must call saveTree() ---
///     actionCloseWindowButDoNotSaveTree_internal() does not.
/// ** The caller must also handle any prompting for confirmation that
///     may be required.
/// @param options {Object} Current keys are is_ui_action.
/// @return An ASQ that will fire when the closing is complete
function actionCloseWindowButDoNotSaveTree_internal(
    win_node_id,
    win_node,
    unused_action_id,
    unused_action_el,
    options = {}
) {
    let win_val = D.windows.by_node_id(win_node_id);
    if (!win_val) return;
    let win = win_val.win;
    let was_open = win_val.isOpen && win;

    // TODO onWinFocusChanged(NONE, true) ?

    win_val.isClosing = true;
    // Prevents onWinRemoved() from calling us to handle the removal!
    M.remember(win_node_id);

    let seq = ASQ();

    // Close the window
    if (was_open) {
        chrome.windows.remove(win.id, ASQH.CCgo(seq, true));
        // True => ignore errors.
        // See https://stackoverflow.com/a/45871870/2877364 by cxw.
    }

    seq.then(() => {
        M.markWinAsClosed(win_val);
    });

    // TODO do all of the following after the windows.remove completes?

    // Collapse the tree, if the user wants that.
    // If the user hit close on a closed window, it's a collapse.
    if (
        S.getBool(S.COLLAPSE_ON_WIN_CLOSE) ||
        (options.is_ui_action && !was_open)
    ) {
        collapseTreeNode(win_node);
    }

    // Mark the tabs in the tree node closed.
    for (let tab_node_id of win_node.children) {
        M.markTabAsClosed(tab_node_id);
    }

    T.treeobj.clear_flags();
    // On close, we can't know where the focus will go next.

    // don't call saveTree --- that's the caller's responsibility
    return seq;
} //actionCloseWindowButDoNotSaveTree_internal()

/// Close the window and save
function actionCloseWindowAndSave(
    win_node_id,
    win_node,
    unused_action_id,
    unused_action_el
) {
    /// Helper to actually close it
    function doClose() {
        actionCloseWindowButDoNotSaveTree_internal(
            win_node_id,
            win_node,
            unused_action_id,
            unused_action_el,
            { is_ui_action: true }
        )
            // true => it came from a user action.  The only places
            // this is invoked are user actions.
            .then(() => {
                saveTree();
            });
    }

    // Prompt for confirmation, if necessary
    let is_audible = false;

    if (S.isCONFIRM_DEL_OF_AUDIBLE_TABS()) {
        for (let child_nodeid of win_node.children) {
            let child_val = D.tabs.by_node_id(child_nodeid);
            if (child_val && child_val.isAudible) {
                is_audible = true;
                break;
            }
        } //foreach child_nodeid
    } //if confirm del of audible

    if (!is_audible) {
        // No confirmation required - just do it
        doClose();
    } else {
        // Confirmation required

        let win_val = D.windows.by_node_id(win_node_id);
        showConfirmationModalDialog(
            _T("dlgpCloseAudibleWindow", M.get_raw_text(win_val)),
            false // Hide "do not show again" for now
        )
            // Processing after the dialog closes
            .val((result) => {
                if (!result) return; // no-op if we didn't get an answer

                /* //////// Not yet - #177
            // Handle "don't ask again", but cancel is always nop.
            if(result.reason !== 'cancel' && result.notAgain) {
                /// The configuration key to clear
                let conf_key = (win_val.keep === K.WIN_KEEP) ?
                    S.CONFIRM_DEL_OF_SAVED :
                    S.CONFIRM_DEL_OF_UNSAVED;
                //log.info({"Don't ask again":conf_key});
                S.set(conf_key, false);
            }
            */

                if (result.reason === "yes") {
                    doClose();
                }
            }); //end post-dialog processing
    } //endif confirmation required
} //actionCloseWindowAndSave()

/// Delete a window's entry in the tree.
/// @param win_node_id {string} the ID of the node to delete
/// @param win_node the node to delete
/// @param evt {Event} (optional) If truthy, the event that triggered the action
/// @param is_internal {Boolean} (optional) If truthy, this is an internal
///                              action, so don't prompt for confirmation.
function actionDeleteWindow(
    win_node_id,
    win_node,
    unused_action_id,
    unused_action_el,
    evt,
    is_internal
) {
    let win_val = D.windows.by_node_id(win_node_id);
    if (!win_val) return;

    /// Helper to actually do the deletion
    function doDeletion() {
        // TODO? refactor to use the model?
        // Close the window and adjust the tree
        actionCloseWindowButDoNotSaveTree_internal(
            win_node_id,
            win_node,
            unused_action_id,
            unused_action_el
        );
        // TODO wait for the returned sequence?

        lastDeletedWindow = [];
        // Remove the tabs from D.tabs
        for (let tab_node_id of win_node.children) {
            let tab_val = D.tabs.by_node_id(tab_node_id);
            if (!tab_val) continue;
            D.tabs.remove_value(tab_val);
            // Save the URLs for "Restore last deleted"
            lastDeletedWindow.push(tab_val.raw_url);
        }

        let next_node = T.treeobj.get_next_dom(win_node, true);

        // Remove the window's node and value
        let scrollOffsets = [window.scrollX, window.scrollY];
        T.treeobj.delete_node(win_node_id); //also deletes child nodes
        // TODO don't actually delete the node until
        // the window is gone.  Test case: window.beforeonunload=()=>true;
        window.scrollTo(...scrollOffsets);

        D.windows.remove_value(win_val);
        win_val = null;

        // We had a click --- hover the node that is now under the mouse.
        // That is the node that was the next-sibling node before.
        // This fixes a bug in which clicking the delete button removes the row,
        // and the row that had been below moves up, but the wholerow hover and the
        // action buttons don't appear for that row.
        //
        // TODO update this when adding full hierarchy (#34).

        if (evt && evt.type === "click" && next_node) {
            T.treeobj.hover_node(next_node);
        }

        saveTree();
    } //doDeletion()

    // Prompt for confirmation, if necessary
    let no_confirmation = !!is_internal;
    let confirm_because_audible = false;

    no_confirmation =
        no_confirmation ||
        (win_val.keep === K.WIN_KEEP && !S.getBool(S.CONFIRM_DEL_OF_SAVED));

    no_confirmation =
        no_confirmation ||
        (win_val.keep === K.WIN_NOKEEP && !S.getBool(S.CONFIRM_DEL_OF_UNSAVED));

    // Check if it's audible, and if that requires confirmation.
    // The is_internal parameter overrides CONFIRM_DEL_OF_AUDIBLE_TABS
    // since is_internal indicates, e.g., a response to onWinRemoved.
    if (!is_internal && S.isCONFIRM_DEL_OF_AUDIBLE_TABS()) {
        for (let child_nodeid of win_node.children) {
            let child_val = D.tabs.by_node_id(child_nodeid);
            if (child_val && child_val.isAudible) {
                confirm_because_audible = true;
                break;
            }
        } //foreach child_nodeid
    } //if confirm del of audible

    if (no_confirmation && !confirm_because_audible) {
        // No confirmation required - just do it
        doDeletion();
    } else {
        // Confirmation required

        showConfirmationModalDialog(
            _T("dlgpDeleteWindow", M.get_raw_text(win_val)),
            !confirm_because_audible // TODO #177
        )
            // Processing after the dialog closes
            .val((result) => {
                if (!result) return; // no-op if we didn't get an answer

                // Handle "don't ask again", but cancel is always nop.
                if (result.reason !== "cancel" && result.notAgain) {
                    /// The configuration key to clear
                    let conf_key =
                        win_val.keep === K.WIN_KEEP
                            ? S.CONFIRM_DEL_OF_SAVED
                            : S.CONFIRM_DEL_OF_UNSAVED;
                    S.set(conf_key, false);
                }

                if (result.reason === "yes") {
                    doDeletion();
                }
            }); //end post-dialog processing
    } //endif confirmation required
} //actionDeleteWindow()

/// Open the rest of the tabs in a partly-open window.
/// @param win_node_id {string} the ID of the window's node
/// @param win_node {object} the window's node
function actionOpenRestOfTabs(
    win_node_id,
    win_node,
    unused_action_id,
    unused_action_el
) {
    if (!win_node_id || !win_node) return;
    let win_val = D.windows.by_node_id(win_node_id);
    if (!win_val) return;
    if (!M.isWinPartlyOpen(win_node)) return;

    let seq = ASQ();

    win_node.children.forEach((child_node_id, curridx) => {
        let child_val = D.tabs.by_node_id(child_node_id);

        if (!child_val.isOpen) {
            // Open the tab
            seq.then((done) => {
                log.info({ "Opening tab": child_val });
                child_val.being_opened = true;
                chrome.tabs.create(
                    {
                        windowId: win_val.win_id,
                        index: curridx,
                        // Chrome magically bumps other tabs out of the way,
                        // so we don't need to use M.chromeIdxOfTab here.
                        url: NEW_TAB_URL + "#" + child_node_id,
                        pinned: !!child_val.isPinned,
                    },
                    ASQH.CC(done)
                );
            });
        } //endif child is closed
    }); //foreach child

    // At the end, update everything
    seq.val(() => {
        M.updateTabIndexValues(win_node, win_node.children);

        // Set the highlights in the tree appropriately
        T.treeobj.flag_node(win_node.id);
        already_flagged_window = true;
        chrome.windows.get(
            win_val.win_id,
            { populate: true },
            flagOnlyCurrentTabCC
        );
    });
} //actionOpenRestOfTabs()

// }}}2
// == Tab actions ======================================================== {{{2

/// Move a window to the top of the tree.  Note: this also scrolls to the top
/// as a side-effect of the fact that the node for the window must have been
/// focused in jstree in order for the context menu to have been activated
/// on that node.  TODO once keyboard shortcuts are added, see if this is
/// still the case.
function actionMoveWinToTop(node_id, node, unused_action_id, unused_action_el) {
    if (!node) return;
    T.treeobj.move_node(node, T.root_node(), 1);
    // 1 => after the holding pen
} //actionMoveWinToTop()

/// Toggle the top border on a node.  This is a hack until I can add
/// dividers.
function actionToggleTabTopBorder(
    node_id,
    node,
    unused_action_id,
    unused_action_el
) {
    //node_id, node, unused_action_id, unused_action_el)
    let tab_val = D.tabs.by_node_id(node_id);
    if (!tab_val) return;

    // Note: adjust this if you add another IT_TAB type.
    if (!M.has_subtype(node_id, K.NST_TOP_BORDER)) {
        M.add_subtype(node_id, K.NST_TOP_BORDER);
    } else {
        M.del_subtype(node_id, K.NST_TOP_BORDER);
    }

    M.remember(node.parent);
    // assume that a user who bothered to add a divider to a tab
    // wants to keep the window the tab is in.

    saveTree();
} //actionToggleTabTopBorder()

/// Edit a node's bullet.  ** Synchronous **.
/// @param node_id {string} The ID of a node representing a tab.
function actionEditTabBullet(
    node_id,
    node,
    unused_action_id,
    unused_action_el
) {
    let val = M.get_node_val(node_id);
    if (!val || val.ty !== K.IT_TAB) return;

    // TODO replace window.prompt with an in-DOM GUI.
    let question = _T("dlgpTabNote", val.raw_title);
    let new_bullet = window.prompt(question, val.raw_bullet || "");
    if (new_bullet === null) return; // user cancelled

    // We need the below for editing the bullet on a tab, which causes
    // that node to be redrawn, but does not trigger a redraw.jstree.
    // We cannot leave this handler attached to redraw_event all the time
    // because it triggers reflow during full redraw, which seems
    // to be the cause of #102.

    // Put the actions in the right place.  TODO move this to model?
    T.treeobj.element.one("redraw_event.jstree", function (evt, evt_data) {
        if (evt_data && typeof evt_data === "object" && evt_data.obj) {
            T.rjustify_node_actions(evt_data.obj);
        }
    });

    val.raw_bullet = new_bullet;
    M.refresh_label(node_id);

    // TODO if window is currently ephemeral, only remember if
    // new_bullet is nonempty.
    M.remember(node.parent);
    // Assume that a user who bothered to add a note
    // wants to keep the window the note is in.

    saveTree();
} //actionEditTabBullet()

/// Delete a tab's entry in the tree.
/// @param node_id {string} the ID of the node to delete
/// @param node the node to delete
/// @param evt {Event} (optional) If truthy, the event that triggered the action
/// @param is_internal {Boolean} (optional) If truthy, this is an internal
///                              action, so don't prompt for confirmation.
///                              ** currently unused **
function actionDeleteTab(
    node_id,
    node,
    unused_action_id,
    unused_action_el,
    evt,
    is_internal_unused
) {
    let tab_val = D.tabs.by_node_id(node_id);
    if (!tab_val) return;
    let tab_node = T.treeobj.get_node(node_id);
    if (!tab_node) return;

    let parent_val = D.windows.by_node_id(tab_node.parent);
    if (!parent_val) return; // don't delete tabs without parents
    let parent_node = T.treeobj.get_node(parent_val.node_id);
    if (!parent_node) return;

    function doDeletion() {
        if (tab_val.tab_id !== K.NONE) {
            // Remove open tabs
            chrome.tabs.remove(tab_val.tab_id, ignore_chrome_error);
            //onTabRemoved will do the rest
        } else {
            // Remove closed tabs
            M.eraseTab(tab_val);

            // If it was the last tab, delete it
            if (parent_node.children.length === 0) {
                M.eraseWin(parent_val);
            }

            saveTree();
            // Save manually because we don't have a handler for
            // onTreeDelete.
        }
    } //doDeletion()

    // Prompt for confirmation, if necessary
    let prompt_name = "dlgpDeleteTab"; // in messages.json
    let is_keep = parent_val.keep === K.WIN_KEEP;
    let is_nokeep = parent_val.keep === K.WIN_NOKEEP;

    // General rule...
    let need_confirmation_general =
        (is_keep && S.isCONFIRM_DEL_OF_SAVED_TABS()) ||
        (is_nokeep && S.isCONFIRM_DEL_OF_UNSAVED_TABS());
    let need_confirmation_audible =
        tab_val.isAudible && S.isCONFIRM_DEL_OF_AUDIBLE_TABS();

    let need_confirmation =
        need_confirmation_general || need_confirmation_audible;

    // ... but we don't usually need confirmation for empty tabs...
    if (/^((chrome:\/\/newtab\/?)|(about:blank))$/i.test(tab_val.raw_url)) {
        need_confirmation = false;
    }

    // ... except when such a tab (or any tab being deleted) is the last
    // tab in its window.  In that case, check the window settings as well.
    if (parent_node.children.length === 1) {
        if (
            (is_keep && S.getBool(S.CONFIRM_DEL_OF_SAVED)) ||
            (is_nokeep && S.getBool(S.CONFIRM_DEL_OF_UNSAVED))
        ) {
            need_confirmation = true;
            need_confirmation_general = true;
            prompt_name = "dlgpDeleteTabAndWindow";
        }
    }

    if (!need_confirmation) {
        // No confirmation required - just do it
        doDeletion();
    } else {
        // Confirmation required
        showConfirmationModalDialog(
            _T(prompt_name, M.get_html_label(tab_val)),
            !(!need_confirmation_general && need_confirmation_audible)
            // "Don't show again" is hidden if it was just about audio
        )
            // Processing after the dialog closes
            .val((result) => {
                if (!result) return; // no-op if we didn't get an answer

                // Handle "don't ask again", but cancel is always nop.
                if (result.reason !== "cancel" && result.notAgain) {
                    /// The configuration key to clear
                    let conf_key = is_keep
                        ? S.CONFIRM_DEL_OF_SAVED_TABS
                        : S.CONFIRM_DEL_OF_UNSAVED_TABS;
                    S.set(conf_key, false);
                }

                if (result.reason === "yes") {
                    doDeletion();
                }
            }); //end post-dialog processing
    } //endif confirmation required
} //actionDeleteTab()

/// Close the tab and save
function actionCloseTabAndSave(
    tab_node_id,
    tab_node,
    unused_action_id,
    unused_action_el
) {
    let tab_val = D.tabs.by_node_id(tab_node_id);
    if (!tab_val || tab_val.tab_id === K.NONE) return; //already closed => nop
    let window_node_id = tab_node.parent;

    function doCloseAndSave() {
        M.remember(window_node_id);

        let tab_id = tab_val.tab_id; // since markTabAsClosed clears it
        M.markTabAsClosed(tab_val);

        let seq = ASQH.NowCC((cc) => {
            chrome.tabs.remove(tab_id, cc);
            // Because the tab is already marked as closed, onTabRemoved()
            // won't delete its node.
        });

        seq.val(() => {
            // Refresh the tab.index values for the remaining tabs
            M.updateTabIndexValues(window_node_id);
            saveTree();
        });
    }

    let need_confirmation_audible =
        tab_val.isAudible && S.isCONFIRM_DEL_OF_AUDIBLE_TABS();

    if (!need_confirmation_audible) {
        doCloseAndSave();
    } else {
        showConfirmationModalDialog(
            _T("dlgpCloseAudibleTab", M.get_html_label(tab_val)),
            !need_confirmation_audible
            // "Don't show again" is hidden if it was just about audio
        )
            // Processing after the dialog closes
            .val((result) => {
                if (result && result.reason === "yes") {
                    doCloseAndSave();
                }
            });
    }
} //actionCloseTabAndSave()

// }}}2
////////////////////////////////////////////////////////////////////////// }}}1
// Tree-node creation // {{{1

// = = = Tabs = = = = = = = = = = = = = = = = = =

function addTabNodeActions(tab_node_id) {
    T.treeobj.make_group(tab_node_id, {
        selector: "div.jstree-wholerow",
        child: true,
        class: K.ACTION_GROUP_WIN_CLASS,
    });

    // Add the buttons in the layout chosen by the user (#152).
    let order = S.getString(S.S_WIN_ACTION_ORDER);
    if (order === "ced") {
        addTabCloseAction(tab_node_id);
        addTabEditAction(tab_node_id);
        addTabDeleteAction(tab_node_id);
    } else if (order === "ecd") {
        addTabEditAction(tab_node_id);
        addTabCloseAction(tab_node_id);
        addTabDeleteAction(tab_node_id);
    } else if (order === "edc") {
        addTabEditAction(tab_node_id);
        addTabDeleteAction(tab_node_id);
        addTabCloseAction(tab_node_id);
    } else {
        //don't add any buttons, but don't crash.
        log.error(`Unknown tab-button order ${order}`);
    }

    function addTabEditAction(tab_node_id) {
        T.treeobj.add_action(tab_node_id, {
            id: "editBullet",
            class: "fff-pencil " + K.ACTION_BUTTON_WIN_CLASS,
            text: "\xa0",
            // I tried this approach but it was a bit ugly.  For example, the
            // image was in the right place but the border of the <i /> was offset
            // down a pixel or two.  Also, the class was required for the
            // "Actually" event check in onTreeSelect.
            //html: `<img src="/assets/icons/pencil.png" class=${K.ACTION_BUTTON_WIN_CLASS} />`,
            grouped: true,
            title: _T("ttEditTab"),
            callback: actionEditTabBullet,
            dataset: { action: "editBullet" },
        });
    } //addTabEditAction()

    function addTabCloseAction(tab_node_id) {
        T.treeobj.add_action(tab_node_id, {
            id: "closeTab",
            class: "fff-picture-delete " + K.ACTION_BUTTON_WIN_CLASS,
            text: "\xa0",
            grouped: true,
            title: "Close and save",
            callback: actionCloseTabAndSave,
            dataset: { action: "closeTab" },
        });
    } //addTabCloseAction()

    function addTabDeleteAction(tab_node_id) {
        T.treeobj.add_action(tab_node_id, {
            id: "deleteTab",
            class: "fff-cross " + K.ACTION_BUTTON_WIN_CLASS,
            text: "\xa0",
            grouped: true,
            title: _T("ttDeleteTab"),
            callback: actionDeleteTab,
            dataset: { action: "deleteTab" },
        });
    } //addTabDeleteAction()
} //addTabNodeActions()

/// Create a tree node for an open tab.
/// @deprecated in favor of M.react_onTabCreated().
/// @param ctab {Chrome Tab} the tab record
/// @return The node ID on success, or falsy on failure.
function createNodeForOpenTab(ctab, parent_node_id) {
    let { node_id, val } = M.vnRezTab(parent_node_id);
    if (!node_id) {
        log.debug({
            "<M> Could not create record for ctab": ctab,
            parent_node_id,
        });
        return false;
    }
    if (!M.markTabAsOpen(val, ctab)) {
        log.debug({ "<M> Could not mark tab as open": ctab, val });
    }

    addTabNodeActions(node_id);

    // The rjustify is a no-op until the actions are added.  If we just added
    // the last child, we haven't necessarily redrawn, so do so. (#200)
    let parent_node = T.treeobj.get_node(parent_node_id);
    if (parent_node.children[parent_node.children.length - 1] === node_id) {
        T.install_rjustify(null, "redraw_event.jstree", "once");
        T.treeobj.redraw_node(node_id);
    }

    return node_id;
} //createNodeForOpenTab()

/// Update tree view on a tree node for an open tab.
/// @param node {Chrome Tab} the tree node for the tab
/// @param parent_node {Chrome Tab} the parent tree node
function updateNodeForOpenTab(node, parent_node) {
    addTabNodeActions(node.id);

    // The rjustify is a no-op until the actions are added.  If we just added
    // the last child, we haven't necessarily redrawn, so do so. (#200)
    if (parent_node.children[parent_node.children.length - 1] === node.id) {
        T.install_rjustify(null, "redraw_event.jstree", "once");
        T.treeobj.redraw_node(node.id);
    }
} //updateNodeForOpenTab()

/// Create a tree node for a closed tab
/// @param tab_data_v1      V1 save data for the tab
/// @param parent_node_id   The node id for a closed window
/// @return node_id         The node id for the new tab, or falsy on failure
function createNodeForClosedTabV1(tab_data_v1, parent_node_id) {
    let { node_id: tab_node_id, val: tab_val } = M.vnRezTab(parent_node_id);
    if (!tab_node_id) {
        log.debug({
            "<M> Could not create record for closed tab": tab_data_v1,
            parent_node_id,
        });
        return false;
    }

    // Copy properties into the details
    copyTruthyProperties(
        tab_val,
        tab_data_v1,
        ["raw_url", "raw_title", "raw_bullet", "raw_favicon_url"],
        String
    );
    copyTruthyProperties(tab_val, tab_data_v1, "isPinned", Boolean);

    M.refresh(tab_val);

    if (tab_data_v1.bordered) M.add_subtype(tab_val, K.NST_TOP_BORDER);

    addTabNodeActions(tab_node_id);

    return tab_node_id;
} //createNodeForClosedTabV1()

// = = = Windows = = = = = = = = = = = = = = = = =

function addWindowNodeActions(win_node_id) {
    T.treeobj.make_group(win_node_id, {
        selector: "div.jstree-wholerow",
        child: true,
        class: K.ACTION_GROUP_WIN_CLASS, // + ' jstree-animated' //TODO?
    });

    // Add the buttons in the layout chosen by the user (#152).
    let order = S.getString(S.S_WIN_ACTION_ORDER);
    if (order === "ced") {
        addWinCloseAction(win_node_id);
        addWinEditAction(win_node_id);
        addWinDeleteAction(win_node_id);
    } else if (order === "ecd") {
        addWinEditAction(win_node_id);
        addWinCloseAction(win_node_id);
        addWinDeleteAction(win_node_id);
    } else if (order === "edc") {
        addWinEditAction(win_node_id);
        addWinDeleteAction(win_node_id);
        addWinCloseAction(win_node_id);
    } else {
        //don't add any buttons, but don't crash.
        log.error(`Unknown window-button order ${order}`);
    }

    // Workers to add the buttons

    function addWinEditAction(win_node_id) {
        T.treeobj.add_action(win_node_id, {
            id: "renameWindow",
            class: "fff-pencil " + K.ACTION_BUTTON_WIN_CLASS,
            text: "\xa0",
            grouped: true,
            title: _T("ttEditWin"),
            callback: actionRenameWindow,
            dataset: { action: "renameWindow" },
        });
    } //addWinEditAction()

    function addWinCloseAction(win_node_id) {
        T.treeobj.add_action(win_node_id, {
            id: "closeWindow",
            class: "fff-picture-delete " + K.ACTION_BUTTON_WIN_CLASS,
            text: "\xa0",
            grouped: true,
            title: _T("ttCloseWin"),
            callback: actionCloseWindowAndSave,
            dataset: { action: "closeWindow" },
        });
    } //addWinCloseAction()

    function addWinDeleteAction(win_node_id) {
        T.treeobj.add_action(win_node_id, {
            id: "deleteWindow",
            class: "fff-cross " + K.ACTION_BUTTON_WIN_CLASS,
            text: "\xa0",
            grouped: true,
            title: _T("ttDeleteWin"),
            callback: actionDeleteWindow,
            dataset: { action: "deleteWindow" },
        });
    } //addWinDeleteAction()
} //addWindowNodeActions()

/// Create a tree node for open Chrome window #cwin.
/// @returns the tree-node ID, or falsy on error.
function createNodeForWindow(cwin, keep) {
    if (!cwin || !cwin.id) return;

    // Don't put our own popup window in the list
    if (cwin.id && cwin.id === my_winid) return;

    let is_first = !!cwin && S.getBool(S.NEW_WINS_AT_TOP);
    let { node_id, val } = M.vnRezWin(is_first);
    if (!node_id) {
        //sanity check
        log.debug({
            "<M> Could not create tree node for open cwin": cwin,
            keep,
        });
        return false;
    }

    M.markWinAsOpen(val, cwin);
    if (keep === K.WIN_KEEP) {
        M.remember(node_id, false);
    } else {
        M.mark_win_as_unsaved(val, false);
    }

    addWindowNodeActions(node_id);

    if (cwin.tabs) {
        // new windows may have no tabs
        for (let ctab of cwin.tabs) {
            log.info(`   ${ctab.id}: ${ctab.title}`);
            createNodeForOpenTab(ctab, node_id); //TODO handle errors
        }
    }

    return node_id;
} //createNodeForWindow()

/// Create a tree node for a closed window
/// @param win_data_v1      V1 save data for the window
/// @return the node ID, or falsy on failure
function createNodeForClosedWindowV1(win_data_v1) {
    let is_ephemeral = Boolean(win_data_v1.ephemeral); // missing => false

    let shouldCollapse = S.getBool(S.COLLAPSE_ON_STARTUP);
    // TODO is this not actually implemented?

    log.info({
        "Closed window": win_data_v1.raw_title,
        "is ephemeral?": is_ephemeral,
    });

    // Make a node for a closed window.  The node is marked KEEP.
    // TODO don't mark it keep if it's ephemeral and still open.
    let { node_id, val } = M.vnRezWin();
    if (!node_id) {
        log.debug({
            "<M> Could not create node for closed window": win_data_v1,
        });
        return false;
    }

    if (!M.remember(node_id, false)) {
        // Closed windows are KEEP by design
        log.debug({
            "<M> Could not mark closed window as KEEP": win_data_v1,
            node_id,
            val,
        });
    }

    // TODO restore ordered_url_hash

    // Mark recovered windows
    if (is_ephemeral) {
        if (!M.add_subtype(node_id, K.NST_RECOVERED)) {
            log.debug({
                "<M> Could not add subtype RECOVERED": node_id,
                val,
                win_data_v1,
            });
        }
    }

    // Update the item details
    let new_title;
    if (is_ephemeral && typeof win_data_v1.raw_title !== "string") {
        new_title = _T("labelRecoveredTabs");
    } else if (is_ephemeral) {
        // and raw_title is a string
        new_title =
            String(win_data_v1.raw_title) + _T("labelRecoveredTabsPostfix");
    } else {
        // not ephemeral
        let n = win_data_v1.raw_title;
        new_title = typeof n === "string" ? n : null;
    }

    val.raw_title = new_title;

    addWindowNodeActions(node_id);
    M.refresh(val);

    if (win_data_v1.tabs) {
        for (let tab_data_v1 of win_data_v1.tabs) {
            createNodeForClosedTabV1(tab_data_v1, node_id);
        }
    }

    M.updateOrderedURLHash(val);
    // Now that all the tabs are in, hash the window.

    return node_id;
} //createNodeForClosedWindowV1()

// = = = Combo = = = = = = = = = = = = = = = = = =

/// Update #existing_win to connect to #cwin.  Also hooks up all the
/// ctabs.
///
/// @param cwin {Chrome Window} The open window, populated with tabs.
/// @param existing_win {object} An object with {val, node}, e.g., from
///                             winAlreadyExistsInTree().
/// @param options {object={}} Options.  Presently:
/// - during_init {Boolean=false} If truthy, failures correspond to init failure.
/// - repin {Boolean=false} If truthy, set the pinned state of each tab from its
///     corresponding tab_val.
/// - tab_node_ids {array} For each Chrome tab in #cwin, the corresponding
///                        node ID.  If missing, the default is
///                        existing_win.node.children (i.e., all tabs open).
///                        The number of tab_node_ids must match the number of
///                        open tabs in #cwin.
///
/// @return truthy on success; falsy on failure
function connectChromeWindowToTreeWindowItem(cwin, existing_win, options = {}) {
    let tab_node_ids = options.tab_node_ids || existing_win.node.children;

    // Attach the open window to the saved window
    log.info({
        [`Attaching window ${cwin.id} to existing window in the tree`]:
            existing_win,
    });

    M.markWinAsOpen(existing_win.val, cwin);
    // Doesn't touch the tabs.

    // If it was open, we by definition didn't need to recover it.
    // Undo the recovery actions that createNodeForClosedWindowV1()
    // took (KEEP, NST_RECOVERED).
    if (M.has_subtype(existing_win.node.id, K.NST_RECOVERED)) {
        M.del_subtype(existing_win.node.id, K.NST_RECOVERED);
        existing_win.val.raw_title = null; //default title
        M.mark_win_as_unsaved(existing_win.val, false);
    }

    if (cwin.tabs.length !== tab_node_ids.length) {
        log.error({
            "Mismatched child count": `${cwin.tabs.length} !== ${tab_node_ids.length}`,
            cwin,
            existing_win,
            options,
        });

        if (options.during_init) was_loading_error = true;
        return false; // TODO handle this better
    }

    // If we reach here, cwin.tabs.length === tab_node_ids.length
    for (let idx = 0; idx < cwin.tabs.length; ++idx) {
        let tab_node_id = tab_node_ids[idx];
        let tab_val = D.tabs.by_node_id(tab_node_id);
        if (!tab_val) continue;

        let ctab = cwin.tabs[idx];

        // Do we need these?
        ctab.url =
            ctab.url || ctab.pendingUrl || tab_val.raw_url || "about:blank";
        ctab.title = ctab.title || tab_val.raw_title || _T("labelUnknownTitle");

        let pinned = tab_val.isPinned;
        M.markTabAsOpen(tab_node_id, ctab);

        // Apply changes from the tab_val to the ctab if requested.
        // New tabs start out unpinned, so we may need to repin.
        if (options.repin && pinned) {
            chrome.tabs.update(ctab.id, { pinned: true }, ignore_chrome_error);
        }
    } //foreach tab

    // Note: We do not need to update existing_win.val.ordered_url_hash.
    // Since we got here, we know that it was a match.
    // However, at the moment, M.updateTabIndexValues() does it anyway.

    M.updateTabIndexValues(existing_win.node.id);

    T.install_rjustify(null, "redraw_event.jstree", "once");
    T.treeobj.redraw_node(existing_win.node);

    return true;
} //connectChromeWindowToTreeWindowItem()

////////////////////////////////////////////////////////////////////////// }}}1
// Loading // {{{1

/// Did we have a problem loading save data?
var was_loading_error = false;

/// See whether an open Chrome window corresponds to a dormant window in the
/// tree.  This may happen, e.g., due to TabFern refresh or Chrome reload.
/// @param cwin {Chrome Window} the open Chrome window we're checking for
///                             a match.
/// @return {mixed} the existing window's node and value as {node, val},
///                 or false if no match.
function winAlreadyExistsInTree(cwin) {
    if (!cwin || !cwin.tabs || cwin.tabs.length < 1) return false;

    // Get #cwin's hash
    let child_urls = [];
    for (let ctab of cwin.tabs) {
        if (!(ctab.url || ctab.pendingUrl)) return false;
        // Assume not existent if we can't tell.
        child_urls.push(ctab.url || ctab.pendingUrl);
    }

    let ordered_url_hash = M.orderedHashOfStrings(child_urls);
    let val = D.windows.by_ordered_url_hash(ordered_url_hash);
    if (!val) return false;

    let node = T.treeobj.get_node(val.node_id);
    if (!node) return false;

    // Sanity check, e.g., in case of corrupted save data.  If the hashes match
    // but the tab counts don't, assume failure.
    if (cwin.tabs.length !== node.children.length) return false;

    return { node, val };
} //winAlreadyExistsInTree()

/// Add the save data into the tree.
/// Design decision: TabFern SHALL always be able to load older save files.
/// Never remove a loader from this function.
/// @post The new windows are added after any existing windows in the tree
/// @param {mixed} data The save data, parsed (i.e., not a JSON-encoded string)
/// @return {number} The number of new windows, or ===false on failure.
///                  ** Note: 0 is a valid number of windows to load!
var loadSavedWindowsFromData = (function () {
    /// Populate the tree from version-0 save data in #data.
    /// V0 format: [win, win, ...]
    /// each win is {text: "foo", tabs: [tab, tab, ...]}
    /// each tab is {text: "foo", url: "bar"}
    function loadSaveDataV0(data) {
        let numwins = 0;
        // Make V1 data from the v0 data and pass it along the chain
        for (let v0_win of data) {
            let v1_win = {};
            v1_win.raw_title = v0_win.text;
            v1_win.tabs = [];
            for (let v0_tab of v0_win.tabs) {
                let v1_tab = { raw_title: v0_tab.text, raw_url: v0_tab.url };
                v1_win.tabs.push(v1_tab);
            }
            createNodeForClosedWindowV1(v1_win);
            ++numwins;
        }
        return numwins; //load successful
    } //loadSaveDataV0

    /// Populate the tree from version-1 save data in #data.
    /// V1 format: { ... , tree:[win, win, ...] }
    /// Each win is {raw_title: "foo", tabs: [tab, tab, ...]}
    ///     A V1 win may optionally include:
    ///     - ephemeral:<truthy> (default false) to mark ephemeral windows.
    ///     - ordered_url_hash {String}
    /// Each tab is {raw_title: "foo", raw_url: "bar"}
    ///     A V1 tab may optionally include:
    ///     - bordered:<truthy> (default false) to mark windows with borders
    function loadSaveDataV1(data) {
        if (!data.tree) return false;
        //log.info({'loadSaveDataV1':data});
        let numwins = 0;
        for (let win_data_v1 of data.tree) {
            createNodeForClosedWindowV1(win_data_v1);
            ++numwins;
        }
        return numwins;
    } //loadSaveDataV1

    /// The mapping table from versions to loaders.
    /// each loader should return truthy if load successful, falsy otherwise.
    let versionLoaders = { 0: loadSaveDataV0, 1: loadSaveDataV1 };

    /// Populate the tree from the save data.
    /// TODO throw on failure, so that the caller can report the details of
    /// the error if desired.
    return function loadSavedWindowsFromData_inner(data) {
        let succeeded = false;
        let loader_retval; // # of wins loaded

        READIT: {
            // Figure out the version number
            let vernum;
            if (Array.isArray(data)) {
                // version 0
                vernum = 0;
            } else if (
                typeof data === "object" &&
                "tabfern" in data &&
                data["tabfern"] === 42 &&
                "version" in data &&
                typeof data.version === "number" &&
                Number.isInteger(data.version)
            ) {
                // a specific version
                vernum = data.version;
            } else {
                log.error(
                    "Could not identify the version number of the save data"
                );
                break READIT;
            }

            // Load it
            if (vernum in versionLoaders) {
                try {
                    T.treeobj.suppress_redraw(true); // EXPERIMENTAL
                    T.do_not_rjustify = true;
                    loader_retval = versionLoaders[vernum](data);
                } catch (e) {
                    log.error(
                        `Error loading version-${vernum} save data: ${e}`
                    );
                    loader_retval = false;
                    // Continue out of the catch block to the cleanup
                }

                // Cleanup from the try block above
                delete T.do_not_rjustify;

                T.treeobj.suppress_redraw(false); // EXPERIMENTAL
                T.treeobj.redraw(true); // Just in case the experiment
                // had different results than
                // we expected!
            } else {
                // unknown version
                log.error(
                    "I don't know how to load save data from version " + vernum
                );
                break READIT;
            } //endif known version else

            if (loader_retval === false) {
                log.error(
                    "There was a problem loading save data of version " + vernum
                );
                break READIT;
            }

            succeeded = true;
        }
        return succeeded ? loader_retval : false;
    }; //loadSavedWindowsFromData_inner()
})(); //loadSavedWindowsFromData()

/// Load the saved windows from local storage - used as part of initialization.
/// @param {function} next_action If provided, will be called when loading
///                     is complete.
function loadSavedWindowsIntoTree(next_action) {
    next_init_step("Load saved windows"); // TODO _T() the step names

    chrome.storage.local.get(K.STORAGE_KEY, function (items) {
        next_init_step("Got save data");

        READIT: if (isLastError()) {
            //Chrome couldn't load the data
            log.error(
                "Chrome couldn't load save data: " +
                    lastBrowserErrorMessageString() +
                    "\nHowever, if you didn't have any save data, this isn't " +
                    "a problem!"
            );

            // If Chrome didn't load the data, don't treat it as a reading
            // error, since it might simply not have existed.  Therefore,
            // we don't set was_loading_error here.  TODO figure out if
            // this makes sense.  Maybe check the specific error returned.
        } else if (K.STORAGE_KEY in items) {
            // Chrome did load the data
            let parsed = items[K.STORAGE_KEY]; // auto JSON.parse
            if (loadSavedWindowsFromData(parsed) === false) {
                was_loading_error = true;
                // HACK - we only use this during init, so
                // set the init-specific variable.
            }
        } else {
            // Brand-new installs seem to fall here: lastError is undefined,
            // but items is {}.  Don't treat this as an error.
            was_loading_error = false;
        }

        // Even if there was an error, call the next action so that
        // the initialization can complete.
        // TODO report this via the DOM?
        if (typeof next_action !== "function") return;
        next_action();
    }); //storage.local.get
} //loadSavedWindowsIntoTree()

// Debug helper, so uses console.log() directly.
function DBG_printSaveData() {
    chrome.storage.local.get(K.STORAGE_KEY, function (items) {
        if (isLastError()) {
            console.log(lastBrowserErrorMessageString());
        } else {
            let parsed = items[K.STORAGE_KEY];
            console.log("Save data:");
            console.log(parsed);
        }
    });
} //DBG_printSaveData()

////////////////////////////////////////////////////////////////////////// }}}1
// jstree callbacks // {{{1

/// ID for a timeout shared by newWinFocusCheckTest() and onTreeSelect()
var awaitSelectTimeoutId = undefined;

/// Process clicks on items in the tree.  Also works for keyboard navigation
/// with arrow keys and Enter.
/// @param evt_unused {Event}   Not currently used
/// @param evt_data {Object}    Has fields node, action, selected, event.
/// @param options {Object}     Valid fields are:
///     - raise_tabfern_after:  if truthy, put the TF popup back on top
///                             once the action has been taken.  (#160)
function onTreeSelect(evt_unused, evt_data, options = {}) {
    log.info({ onTreeSelect: evt_data, options });

    /// What kinds of things can happen as a result of a select event
    let ActionTy = Object.freeze({
        nop: "nop",
        activate_win: "activate_win", // win is open, as are all tabs
        open_rest: "open_rest", // win is open, but not all tabs
        activate_tab: "activate_tab", // tab is open
        open_tab_in_win: "open_tab_in_win",
        // win is open, but tab is closed; open tab in existing window

        open_win: "open_win", // win is closed; open all tabs
        open_win_and_tab: "open_win_and_tab", // win is closed; open one tab
    });

    if (typeof evt_data.node === "undefined") return;

    // Cancel a timer waiting for selection, if any.
    if (typeof awaitSelectTimeoutId !== "undefined") {
        window.clearTimeout(awaitSelectTimeoutId);
        awaitSelectTimeoutId = undefined;
    }

    let node = evt_data.node;

    // TODO figure out why this doesn't work: T.treeobj.deselect_node(node, true);
    T.treeobj.deselect_all(true);
    // Clear the selection.  True => no event due to this change.

    // --- Check for button clicks ------------------------------------
    // Now that the selection is clear, see if this actually should have been
    // an action-button click.  The evt_data.event is not necessarily a
    // click.  For example, it can be a 'select_node' event from jstree.

    if (evt_data.event && evt_data.event.clientX) {
        let e = evt_data.event;
        let elem = document.elementFromPoint(e.clientX, e.clientY);
        if (elem && $(elem).hasClass(K.ACTION_BUTTON_WIN_CLASS)) {
            // The events were such that the user clicked a button but the
            // event went to the wholerow.  I think this is because of how
            // focus/blur happens when you focus a window by clicking on an
            // element in it.  Maybe the mousedown is being
            // lost to the focus change, so the mouseup doesn't trigger a
            // click?  Not sure.
            // Anyway, dispatch the actual action.
            let action =
                elem.dataset && elem.dataset.action
                    ? elem.dataset.action
                    : "** unknown action **";

            log.info({ "Actually, button press": elem, action, evt_data });

            switch (action) {
                // Windows
                case "renameWindow":
                    actionRenameWindow(node.id, node, null, null);
                    break;
                case "closeWindow":
                    actionCloseWindowAndSave(node.id, node, null, null);
                    break;
                case "deleteWindow":
                    actionDeleteWindow(
                        node.id,
                        node,
                        null,
                        null,
                        evt_data.event
                    );
                    // Pass the event so actionDeleteWindow will treat it
                    // as a click and refresh the hover state.
                    break;

                // Tabs
                case "editBullet":
                    actionEditTabBullet(node.id, node, null, null);
                    break;

                case "closeTab":
                    actionCloseTabAndSave(node.id, node, null, null);
                    break;

                case "deleteTab":
                    actionDeleteTab(node.id, node, null, null, evt_data.event);
                    // as deleteWindow, above.
                    break;

                default:
                    break; //no-op if unknown
            }

            // Whether or not we were able to process the click, it wasn't
            // a selection.  Therefore, don't proceed with the normal
            // on-select operations.
            return;
        } //endif the click was actually an action button
    } //endif event has clientX

    // --- Figure out what to do --------------------------------------

    let node_val,
        is_tab = false,
        is_win = false;
    let tab_val, win_val, tab_node, win_node;

    let win_id_to_highlight_and_raise;
    // If assigned, this window will be brought to the front at the
    // end of this function.
    let win_node_id;

    if ((node_val = D.tabs.by_node_id(node.id))) {
        is_tab = true;
        tab_val = node_val;
        tab_node = node;

        let parent_node_id = tab_node.parent;
        if (!parent_node_id) return;
        win_node = T.treeobj.get_node(parent_node_id);
        if (!win_node) return;

        win_node_id = parent_node_id;
        win_val = D.windows.by_node_id(parent_node_id);
        if (!win_val) return;
    } else if ((node_val = D.windows.by_node_id(node.id))) {
        is_win = true;
        win_val = node_val;
        win_node_id = win_val.node_id;
        win_node = T.treeobj.get_node(win_node_id);
        if (!win_node) return;

        // tab_val and tab_node stay falsy.
    } else {
        log.error("Selection of unknown node " + node);
        return; // unknown node type
    }

    let action = ActionTy.nop;

    if (win_val.isOpen) {
        if (is_win) {
            // clicked on an open window

            if (M.isWinPartlyOpen(win_node) && S.isOROC()) {
                action = ActionTy.open_rest;
            } else {
                action = ActionTy.activate_win;
            }
        } else {
            // clicked on a tab in an open window
            action = tab_val.isOpen
                ? ActionTy.activate_tab
                : ActionTy.open_tab_in_win;
        }
    } else {
        // window is closed
        action = is_win ? ActionTy.open_win : ActionTy.open_win_and_tab;
    }

    let already_flagged_window = false;

    // --- Do it ------------------------------------------------------

    // Remove "recovered" flags.  TODO update this when #34 is implemented.
    if (win_node && M.has_subtype(win_node, K.NST_RECOVERED)) {
        M.del_subtype(win_node, K.NST_RECOVERED);
    }

    if (action === ActionTy.activate_tab) {
        if (BROWSER_TYPE === "ff") {
            ASQ()
                .promise(browser.tabs.update(node_val.tab_id, { active: true }))
                .or((err) => {
                    log.warn({ "Could not highlight tab": node_val, err });
                });
        } else {
            //Chrome
            chrome.tabs.highlight(
                {
                    windowId: node_val.win_id,
                    tabs: [node_val.index], // Jump to the clicked-on tab
                },
                ignore_chrome_error
            );
        }

        T.treeobj.flag_node(tab_node);
        win_id_to_highlight_and_raise = tab_val.win_id;
    } else if (action === ActionTy.activate_win) {
        win_id_to_highlight_and_raise = node_val.win_id;
    } else if (action === ActionTy.open_rest) {
        win_id_to_highlight_and_raise = win_val.win_id;
        actionOpenRestOfTabs(win_node.id, win_node, null, null);
    } else if (
        action === ActionTy.open_win ||
        action === ActionTy.open_win_and_tab
    ) {
        // Ignore attempts to open two windows at once, since we currently
        // can't handle them.
        if (window_is_being_restored) return;

        let urls = [];
        let tab_node_ids;

        if (action === ActionTy.open_win) {
            // Open all tabs
            for (let child_id of win_node.children) {
                let child_val = D.tabs.by_node_id(child_id);
                urls.push(child_val.raw_url);
                // TODO: in Firefox, you can't call window.create with a
                // URL of about:addons or about:debugging.
            }
            tab_node_ids = win_node.children;
        } else {
            // Open only one tab
            urls.push(tab_val.raw_url);
            tab_node_ids = [tab_node.id];
        }

        log.info({
            "Opening window": urls,
            tab_node_ids,
            tab_node,
            tab_val,
            win_node,
            win_val,
        }); // keep them in scope

        // Open the window
        window_is_being_restored = true;
        let create_data = {
            url: urls,
            left: newWinSize.left,
            top: newWinSize.top,
            width: newWinSize.width,
            height: newWinSize.height,
        };
        if (BROWSER_TYPE !== "ff") {
            create_data.focused = true;
        }

        let win_create_cbk = function win_create_cbk(cwin) {
            // TODO: in Firefox, I'm not sure if this gets called after
            // an error.  Try to open a saved window with a tab
            // for about:addons or about:debugging to trigger an error.

            // Note: In testing, this happens after the onWinCreated,
            // onTabCreated, and onTabActivated events.  I don't know
            // if that's guaranteed, though.
            window_is_being_restored = false;

            if (isLastError()) {
                window.alert(
                    _T("errCouldNotOpenWindow", lastBrowserErrorMessageString())
                );
                return; // with the state in the tree unchanged
            }

            // Update the tree and node mappings
            log.info("Adding nodeid map for winid " + cwin.id);
            log.trace({
                urls,
                tab_node_ids,
                tab_node,
                tab_val,
                win_node,
                win_val,
            }); // keep them in scope

            connectChromeWindowToTreeWindowItem(
                cwin,
                { val: win_val, node: win_node },
                { repin: true, tab_node_ids }
            );

            // Set the highlights in the tree appropriately
            T.treeobj.flag_node(win_node.id);
            already_flagged_window = true;
            flagOnlyCurrentTab(cwin);

            if (options.raise_tabfern_after) {
                chrome.windows.update(
                    my_winid,
                    { focused: true },
                    ignore_chrome_error
                );
            }
        }; //win_create_cbk callback

        log.info({ "Creating window": create_data });

        try {
            // On FF, create() throws on restricted URLs
            chrome.windows.create(create_data, win_create_cbk);
        } catch (e) {
            log.warn({ "Could not create window": e, create_data });
            window_is_being_restored = false;
            window.alert(_T("errCouldNotCreateWindow", e));
            return;
        }
    } else if (action === ActionTy.open_tab_in_win) {
        // add tab to existing win

        // Figure out where to put it
        let newindex = M.chromeIdxOfTab(win_node_id, tab_node.id);

        // Open the tab
        tab_val.being_opened = true;
        // TODO FIXME wrap this in a try/catch for FF
        chrome.tabs.create(
            {
                windowId: win_val.win_id,
                index: newindex,
                url: tab_val.raw_url,
                url: NEW_TAB_URL + "#" + tab_node.id,
                active: true,
                pinned: !!tab_val.isPinned,
            },
            function (ctab) {
                // onTabCreated connects the node to the ctab.
                M.updateTabIndexValues(win_node, [tab_node.id]);

                // Set the highlights in the tree appropriately
                T.treeobj.flag_node(win_node.id);
                already_flagged_window = true;
                chrome.windows.get(
                    win_val.win_id,
                    { populate: true },
                    flagOnlyCurrentTabCC
                );

                //win_id_to_highlight_and_raise = win_val.win_id;
                // TODO FIXME - this is ineffective here.
                // May be related to #138

                if (options.raise_tabfern_after) {
                    chrome.windows.update(
                        my_winid,
                        { focused: true },
                        ignore_chrome_error
                    );
                }
            } //tabs.create callback
        ); //tabs.create
    } //endif open_tab_in_win

    // Set highlights for the window, unless we had to open a new window.
    // If we opened a new window, the code above handled this.
    if (!already_flagged_window && win_id_to_highlight_and_raise) {
        unflagAllWindows();

        // Clear the other windows' tabs' flags.
        let node_id = D.windows.by_win_id(
            win_id_to_highlight_and_raise,
            "node_id"
        );
        if (node_id) {
            T.treeobj.clear_flags_by_multitype(K.IT_TAB, node_id, true);
            // Don't clear flags from children of node_id
            // true => no event
            T.treeobj.open_node(node_id);
        }
    } //endif need to flag

    // Activate the window, if it still exists.
    if (options.raise_tabfern_after) {
        win_id_to_highlight_and_raise = my_winid;
    }

    if (win_id_to_highlight_and_raise) {
        log.debug({ "About to activate": win_id_to_highlight_and_raise });
        chrome.windows.update(
            win_id_to_highlight_and_raise,
            { focused: true },
            ignore_chrome_error
        );
        // onWinFocusChanged will set the flag on the newly-focused window
    } //endif
} //onTreeSelect()

////////////////////////////////////////////////////////////////////////// }}}1
// Chrome window/tab callbacks // {{{1

function onWinCreated(cwin) {
    log.info({
        "Window created": cwin.id,
        "Restore?": window_is_being_restored ? "yes" : "no",
        cwin,
    });

    T.treeobj.clear_flags();

    if (window_is_being_restored) {
        return; // don't create an extra copy - the chrome.window.create
    } // callback in onTreeSelect will handle it.

    // Save the window's size
    if (cwin.type === "normal") {
        winSizes[cwin.id] = getCWinGeometry(cwin);
        newWinSize = winSizes[cwin.id];
        // Chrome appears to use the last-resized window as its size
        // template even when you haven't closed it, so do similarly.
        // ... Well, maybe the last-resized window with a non-blank tab ---
        // not entirely sure.
    }

    createNodeForWindow(cwin, K.WIN_NOKEEP);
    saveTree(); // for now, brute-force save on any change.
} //onWinCreated()

/// Update the tree when the user closes a browser window
function onWinRemoved(cwin_id) {
    if (cwin_id == my_winid) return; // does this happen?

    log.info({ "Window removed": cwin_id });

    // Stash the size of the window being closed as the size for
    // reopened windows.
    if (cwin_id in winSizes) {
        // TODO only do this if cwin_id's type is "normal"
        newWinSize = winSizes[cwin_id];
        delete winSizes[cwin_id];
    }

    let node_val = D.windows.by_win_id(cwin_id);
    if (!node_val) return; // e.g., already closed
    let node_id = node_val.node_id;
    if (!node_id) return;

    if (node_val.keep === K.WIN_KEEP) {
        lastSavedClosedWindow_node_id = node_id;
    }

    let node = T.treeobj.get_node(node_id);
    if (!node) return;

    log.debug({ "Node for window being removed": node });

    // Keep the window record in place if it is saved and still has children.
    // If it's not saved, toss it.
    // If it is saved, but no longer has any children, toss it.  This can
    // happen, e.g., when dragging the last tab(s) in the Chrome window to
    // attach them to another window.
    if (
        node_val.keep === K.WIN_KEEP &&
        node.children &&
        node.children.length > 0
    ) {
        node_val.isOpen = false; // because it's already gone
        if (node_val.win && !node_val.isClosing) {
            actionCloseWindowButDoNotSaveTree_internal(
                node_id,
                node,
                null,
                null
            );
            // Since it was saved, leave it saved.  You can only get rid of
            // saved sessions by X-ing them expressly (actionDeleteWindow).
            // if(node_val.win) because a window closed via
            // actionCloseWindowButDoNotSaveTree_internal or actionDeleteWindow
            // will have a falsy node_val.win, so we don't need to call those
            // functions again.  aCWBDNST_internal() never prompts for
            // confirmation.
        }
        saveTree(); // TODO figure out if we need this.
    } else {
        // Not saved - just toss it.
        actionDeleteWindow(node_id, node, null, null, null, true);
        // This removes the node's children also.
        // actionDeleteWindow also saves the tree, so we don't need to.
        // true => it's internal, so don't prompt for confirmation.
    }
} //onWinRemoved()

/// Update the highlight for the current window.  Note: this does not always
/// seem to fire when switching to a non-Chrome window.
/// See https://stackoverflow.com/q/24307465/2877364 - onFocusChanged
/// is known to be a bit flaky.
///
/// @param win_id {number} the ID of the newly-focused window
/// @param internal {boolean} if truthy, this was called as a helper, e.g., by
///                 onTabActivated or onTabDeactivated.  Therefore, it has work
///                 to do even if the window hasn't changed.
var onWinFocusChanged;

/// Initialize onWinFocusChanged.  This is a separate function since it
/// cannot be called until jQuery has been loaded.
function initFocusHandler() {
    /// The type of window focus is changing from
    const [FC_FROM_TF, FC_FROM_NONE, FC_FROM_OPEN] = [
        "from_tf",
        "from_none",
        "from_open",
    ];
    /// The type of window focus is changing to
    const [FC_TO_TF, FC_TO_NONE, FC_TO_OPEN] = ["to_tf", "to_none", "to_open"];

    /// Sugar
    const WINID_NONE = chrome.windows.WINDOW_ID_NONE;

    /// The previously-focused window
    let previously_focused_winid = WINID_NONE;

    /// clientX, Y while focus was elsewhere
    var x_blurred = undefined,
        y_blurred = undefined;

    /// Set up event listeners for DOM onfocus/onblur
    $(function () {
        /// Track the coordinates while the mouse is moving over the
        /// non-focused TabFern window.
        /// Mousedown doesn't help since it fires after the focus event.
        function onmousemove(evt) {
            x_blurred = evt.clientX;
            y_blurred = evt.clientY;
        }

        /// Focus event handler.  Empirically, this happens after the
        /// chrome.windows.onFocusChanged event.
        $(window).focus(function (evt) {
            if (log.getLevel() <= log.levels.DEBUG) {
                let obj = { onfocus: evt };
                obj.x_blurred =
                    typeof x_blurred === "number" && Number.isFinite(x_blurred)
                        ? x_blurred
                        : String(x_blurred);

                obj.y_blurred =
                    typeof y_blurred === "number" && Number.isFinite(y_blurred)
                        ? y_blurred
                        : String(y_blurred);

                if (
                    typeof obj.x_blurred === "number" &&
                    typeof obj.y_blurred === "number"
                ) {
                    obj.elts = document.elementsFromPoint(x_blurred, y_blurred);
                }

                log.debug(obj);
            } //endif DEBUG

            $(window).off("mousemove.tabfern");
            x_blurred = undefined; // can't leave them sitting around,
            y_blurred = undefined; // lest we risk severe confusion.
        });

        $(window).blur(function (evt) {
            $(window).on("mousemove.tabfern", onmousemove);
            // Track pointer position while the window is blurred so we
            // can take a reasonable guess, in the onFocusChanged handler,
            // what element was clicked.
        });
    }); //end listener setup

    /// Helper for cleaning up flags on the window we're leaving.
    /// Clear the flags on #old_win_id and its tabs.
    function leavingWindow(old_win_id) {
        let old_node_id = D.windows.by_win_id(old_win_id, "node_id");
        if (!old_node_id) return;

        T.treeobj.flag_node(old_node_id, false);

        let old_node = T.treeobj.get_node(old_node_id);
        if (!old_node) return;
        T.treeobj.flag_node(old_node.children, false);
    } //leavingWindow

    /// The actual onFocusChanged event handler
    function inner_onFocusChanged(win_id, _unused_internal) {
        let old_win_id = previously_focused_winid;

        // What kind of change is it?
        let change_from, change_to;
        if (win_id === my_winid) change_to = FC_TO_TF;
        else if (win_id === WINID_NONE) change_to = FC_TO_NONE;
        else change_to = FC_TO_OPEN;

        if (old_win_id === my_winid) change_from = FC_FROM_TF;
        else if (old_win_id === WINID_NONE) change_from = FC_FROM_NONE;
        else change_from = FC_FROM_OPEN;

        // Uncomment if you are debugging focus-change behaviour
        //log.info({change_from, old_win_id, change_to, win_id});

        let same_window = old_win_id === win_id;
        previously_focused_winid = win_id;

        // --- Handle the changes ---

        if (change_to === FC_TO_OPEN) {
            let win_val = D.windows.by_win_id(win_id);
            if (!win_val) return;
            let win_node = T.treeobj.get_node(win_val.node_id);
            if (!win_node) return;

            NEWWIN: if (!same_window) {
                leavingWindow(old_win_id);

                // Flag the newly-focused window
                T.treeobj.flag_node(win_node.id);
            }

            // Flag the current tab within the new window
            chrome.windows.get(
                win_id,
                { populate: true },
                flagOnlyCurrentTabCC
            );
        } //endif to_open
        else if (change_to === FC_TO_NONE) {
            unflagAllWindows();
            // leave tab flags alone so you can see by looking at the TabFern
            // window which tab you have on top.
        } else if (change_to === FC_TO_TF) {
            if (
                typeof x_blurred === "number" &&
                typeof y_blurred === "number"
            ) {
                // We can guess where the click was
                let elts = document.elementsFromPoint(x_blurred, y_blurred);
                if (
                    elts &&
                    elts.length &&
                    elts.includes(document.getElementById("maintree"))
                ) {
                    // A click on the tree.  Guess that there may be
                    // an action coming.
                    log.debug({ "Awaiting select": 1, elts });
                    awaitSelectTimeoutId = window.setTimeout(function () {
                        leavingWindow(old_win_id);
                    }, 100);
                    // If onTreeSelect() happens before the timeout,
                    // the timeout will be cancelled.  Otherwise, the
                    // flags will be cleared.  This should reduce
                    // flicker in the TabFern window, because onTreeSelect
                    // can do the flag changes instead of this.
                } else {
                    // A click somewhere other than the tree
                    unflagAllWindows();
                }
            } else {
                // We do not know where the click was (e.g., Alt-Tab out/in)
                unflagAllWindows();
                // leave tab flags alone
            }
        } //endif to_tf
    } //inner_onFocusChanged

    onWinFocusChanged = inner_onFocusChanged;
} //initFocusHandler()

/// Process creation of a tab.  NOTE: in Chrome 60.0.3112.101, we sometimes
/// get two consecutive tabs.onCreated events for the same tab.  Therefore,
/// we check for that here.
var onTabCreated = (function () {
    // search key: function onTabCreated()

    /// Detach nodes for existing windows and tabs from those windows/tabs,
    /// and destroy the parts of the model that used to represent those
    /// windows/tabs.
    /// TODO handle failure better
    /// @return truthy for success, falsy for failure
    function destroy_subtree_but_not_widgets(node_id) {
        let node = T.treeobj.get_node(node_id);
        if (!node) return false;

        for (let child_node_id of node.children) {
            if (!M.markTabAsClosed(child_node_id)) return false;
            if (!M.eraseTab(child_node_id)) return false;
        }

        if (!M.markWinAsClosed(node_id)) return false;
        if (!M.eraseWin(node_id)) return false;

        return true;
    } //destroy_subtree_but_not_widgets()

    /// Make an ASQ step that will check if the window matches an existing
    /// window.
    function make_merge_check_step(ctab, win_val) {
        return function merge_check_inner(check_done) {
            log.debug({
                [`merge check tab ${ctab.id} win ${ctab.windowId}`]: ctab,
            });

            let seq = ASQH.NowCCTry((cc) => {
                chrome.windows.get(ctab.windowId, { populate: true }, cc);
            });

            seq.then((done, cwin_or_err) => {
                if (ASQH.is_asq_try_err(cwin_or_err)) {
                    done.fail(cwin_or_err.catch);
                    return;
                }

                let cwin = cwin_or_err;
                let merge_to_win = winAlreadyExistsInTree(cwin);
                MERGE: if (
                    merge_to_win &&
                    merge_to_win.val &&
                    !merge_to_win.val.isOpen && // don't hijack other open wins
                    merge_to_win.val.node_id
                ) {
                    log.info({
                        [`merge ${cwin.id} Found merge target in tree for`]:
                            cwin,
                        merge_to_win,
                    });
                    log.debug(`merge ${ctab.windowId}==${cwin.id}: start`);

                    // Open the saved window and connect it with the new tabs.
                    // ** Make sure to do this synchronously. **
                    // We get multiple onTabCreated messages, and more than one
                    // could reach this point.

                    // The window we are going to pull from
                    let merge_from_win_val = D.windows.by_win_id(cwin.id);
                    if (!merge_from_win_val) {
                        log.debug(
                            `merge ${cwin.id}: bail - could not get merge_from_win_val`
                        );
                        break MERGE;
                    }

                    if (
                        merge_to_win.val.node_id ===
                        lastSavedClosedWindow_node_id
                    ) {
                        log.info(
                            `merge ${cwin.id}: bail - I ` +
                                "won't merge with the most-recently-closed window"
                        );
                        break MERGE;
                    }

                    // Detach the existing nodes from their chrome wins/tabs
                    if (
                        !destroy_subtree_but_not_widgets(
                            merge_from_win_val.node_id
                        )
                    ) {
                        log.debug(
                            `merge ${cwin.id}: bail - could not remove subtree for open window`
                        );
                        break MERGE;
                    }

                    // Connect the old nodes to the wins/tabs
                    connectChromeWindowToTreeWindowItem(
                        cwin,
                        merge_to_win,
                        false
                    );

                    // TODO make sure the correct window is carrying the
                    // ordered_url_hash in the multidex.  I think this might
                    // be where #119 is happening.
                } //endif existing (MERGE)
            });

            seq.pipe(check_done);
        }; //merge_check_inner()
    } //make_merge_check_step()

    /// Check if we're opening a tab on our own initiative, e.g., because
    /// it was dragged from a closed window into an open window.
    /// This is indicated by the URL being NEW_TAB_URL.
    /// @return {Boolean} true if we handled the action, false otherwise
    function handle_tabfern_action(tab_val, ctab) {
        let tab_node_id = getNewTabNodeId(ctab);
        if (!tab_node_id) return false; // Not a NEW_TAB_URL

        // See if the hash is a node ID for a tab.
        tab_val = D.tabs.by_node_id(tab_node_id);
        if (!tab_val || !tab_val.being_opened) return false;

        // If we get here, it is a tab we are opening.  Change the URL
        // to the URL we actually wanted (the NEW_TAB_URL page is a placeholder)

        tab_val.being_opened = false;

        // Attach the ctab to the value
        D.tabs.change_key(tab_val, "tab_id", ctab.id);
        tab_val.win_id = ctab.windowId;
        tab_val.index = ctab.index;
        tab_val.tab = ctab;
        M.add_subtype(tab_node_id, K.NST_OPEN);

        // Change the ctab's URL to the actual URL.
        let seq = ASQ();
        chrome.tabs.update(ctab.id, { url: tab_val.raw_url }, ASQH.CCgo(seq));
        // onTabUpdated will change the tree based on the update,
        // and will call saveTree().

        // Design decision: Since this change was a result of action by
        // TabFern or TF's user, it's not a merge candidate.  E.g., having
        // the user drag and drop a tab, and then suddenly have an
        // unexpected merge happen, would be quite disruptive.

        return true; // It's handled!
    } //handle_tabfern_action()

    // The main worker for onTabCreated
    function on_tab_created_inner(ctab) {
        log.info({ "Tab created": ctab.id, ctab });

        let win_val = D.windows.by_win_id(ctab.windowId);
        let win_node_id = win_val ? win_val.node_id : undefined;
        if (!win_node_id) {
            log.info(`Unknown window ID ${ctab.windowId} - ignoring`);
            return;
        }

        let tab_val = D.tabs.by_tab_id(ctab.id);

        // If it's a tab action we triggered, process it.
        if (handle_tabfern_action(tab_val, ctab)) {
            return; // *** EXIT POINT ***
        }

        /// What to do after saving
        let cbk;

        let tab_node_id = M.react_onTabCreated(win_val, ctab);

        if (tab_val) {
            // It already existed, so react_onTabCreated() didn't
            // make a new tree node.
            // Design decision: rearranging tabs doesn't trigger a merge check
            saveTree(true, cbk);
        } else {
            // Not a duplicate - we just made a new tree node
            updateNodeForOpenTab(
                T.treeobj.get_node(tab_node_id),
                T.treeobj.get_node(win_node_id)
            );

            let seq = ASQ();

            // Design decision: after creating the node, check if it's a
            // duplicate.
            seq.try(make_merge_check_step(ctab, win_val));
            // .try => always run the following saveTree

            seq.then((done) => {
                saveTree(true, done);
            });
        }
    } //on_tab_created_inner()

    return on_tab_created_inner;
})(); //onTabCreated()

function onTabUpdated(ctabid, changeinfo, ctab) {
    log.info({ "Tab updated": ctabid, Index: ctab.index, changeinfo, ctab });

    const errmsg = M.react_onTabUpdated(ctabid, changeinfo, ctab);

    if (typeof errmsg === "string") {
        log.warn(
            `Could not update ${ctabid} per ${JSON.stringify(
                changeinfo
            )} / ${JSON.stringify(ctab)}: ${errmsg}`
        );
        return;
    }

    if (errmsg.dirty) {
        // react_onTabUpdated returns {dirty} on success.
        // TODO clean this up - #232
        saveTree();
    }

    // For some reason, Ctl+N plus filling in a tab doesn't give me a
    // focus change to the new window.  Therefore, if the tab that has
    // changed is in the active window, update the flags for
    // that window.
    chrome.windows.getLastFocused(function (win) {
        if (!isLastError()) {
            if (ctab.windowId === win.id) {
                onWinFocusChanged(win.id, true);
            }
        }
    });
} //onTabUpdated()

/// Keep statistics of the sizes of moves we see from Chrome.  DEBUG
var tab_move_deltas = {};

/// Handle movements of open tabs or groups of tabs within a window.
function onTabMoved(tabid, moveinfo) {
    log.info({ "Tab moved": tabid, toIndex: moveinfo.toIndex, moveinfo });

    // Count statistics
    tab_move_deltas[moveinfo.toIndex - moveinfo.fromIndex] =
        (tab_move_deltas[moveinfo.toIndex - moveinfo.fromIndex] || 0) + 1;

    const errmsg = M.react_onTabMoved(
        moveinfo.windowId,
        tabid,
        moveinfo.fromIndex,
        moveinfo.toIndex
    );

    if (typeof errmsg === "string") {
        log.warn(
            `Could not move tab ${tabid} per ${JSON.stringify(
                moveinfo
            )}: ${errmsg}`
        );
        return;
    }

    saveTree();
} //onTabMoved()

function onTabActivated(activeinfo) {
    log.info({ "Tab activated": activeinfo.tabId, activeinfo });

    onWinFocusChanged(activeinfo.windowId, true);
    // onWinFocusChanged handles the tab flagging

    // No need to save --- we don't save which tab is active.
} //onTabActivated()

/// Delete a tab's information when the user closes it.
function onTabRemoved(tabid, removeinfo) {
    log.info({ "Tab removed": tabid, removeinfo });

    // If the window is closing, do not remove the tab records.
    // The cleanup will be handled by onWinRemoved().
    if (removeinfo.isWindowClosing) {
        log.debug({
            "Window is closing, so nothing to do for ctab": tabid,
            removeinfo,
        });
        return;
        // TODO also mark this as non-recovered, maybe?
    }

    const errmsg = M.react_onTabRemoved(tabid, removeinfo.windowId);

    if (typeof errmsg === "string") {
        log.warn(
            `Could not remove ${tabid} per ${JSON.stringify(
                removeinfo
            )}: ${errmsg}`
        );
        return;
    }

    saveTree();
} //onTabRemoved()

/// When tabs detach, move them to the holding pen.
/// If the detached tab is the last open tab in a window, Chrome will
/// fire onWinRemoved.  Therefore, this function does not have to touch
/// the window.
function onTabDetached(tabid, detachinfo) {
    // Don't save here --- we get a WindowCreated if the tab is dragged into
    // its own new window rather than into an existing window
    log.info({ "Tab detached": tabid, detachinfo });

    T.treeobj.clear_flags(); //just to be on the safe side

    const errmsg = M.react_onTabDetached(tabid, detachinfo.oldWindowId);

    if (typeof errmsg === "string") {
        throw new Error(
            `Could not detach ${tabid} per ${JSON.stringify(
                detachinfo
            )}: ${errmsg}`
        );
    }
} //onTabDetached()

/// When tabs attach, move them out of the holding pen.
function onTabAttached(tabid, attachinfo) {
    log.info({ "Tab attached": tabid, attachinfo });

    const errmsg = M.react_onTabAttached(
        tabid,
        attachinfo.newWindowId,
        attachinfo.newPosition
    );

    if (typeof errmsg === "string") {
        throw new Error(
            `Could not attach ${tabid} per ${JSON.stringify(
                attachinfo
            )}: ${errmsg}`
        );
    }
} //onTabAttached()

/// Handle tab replacement, which can occur with preloads.  E.g., #129.
function onTabReplaced(addedTabId, removedTabId) {
    log.info(`Tab being replaced: ${removedTabId} -> ${addedTabId}`);

    const errmsg = M.react_onTabReplaced(addedTabId, removedTabId);

    if (typeof errmsg === "string") {
        throw new Error(
            `Could not replace ${removedTabId} with ${addedTabId}: ${errmsg}`
        );
    }
} //onTabReplaced()

////////////////////////////////////////////////////////////////////////// }}}1
// DOM event handlers // {{{1

/// ID of a timer to save the new window size after a resize event
var resize_save_timer_id;

/// A cache of the last size we successfully saved to disk.
/// @invariant last_saved_size.winState === 'normal' always (#192).
var last_saved_size;

/// Save #size_data as the size of our popup window
function saveViewSize(size_data) {
    log.debug({ "Saving new size": size_data });

    let to_save = { [K.LOCN_KEY]: size_data };

    ASQH.NowCC((cc) => {
        chrome.storage.local.set(to_save, cc);
    })
        .val(() => {
            last_saved_size = K.dups(size_data);
            if (size_data.winState != "normal") {
                // I think that, if everything is working as it should, we will
                // only save normal states.  Modify as needed based on the
                // answer to the OPEN QUESTION below.
                log.warn({
                    'Window size saved with state other than "normal"':
                        size_data,
                });
            }
            log.info({ "Saved size": last_saved_size });
        })
        .or((err) => {
            log.error({ "TabFern: couldn't save view size": err });
        });
} //saveViewSize()

/// When the user resizes the tabfern popup, save the size for next time.
/// @invariant last_saved_size.winState === 'normal'
function eventOnResize(evt) {
    chrome.windows.get(my_winid, (cwin) => {
        // Clear any previous timer we may have had running
        if (resize_save_timer_id) {
            window.clearTimeout(resize_save_timer_id);
            resize_save_timer_id = undefined;
        }

        // Only save size if the window state is normal.
        // OPEN QUESTION: should the size be saved if maximized or fullscreen,
        // even if not the state?  Or should max/fullscreen states be saved
        // as well?
        let size_data =
            cwin.state == "normal" ? getCWinGeometry(cwin) : last_saved_size;

        // Save the size, but only after 200 ms go by.  This is to avoid
        // saving until the user is actually done resizing.
        // 200 ms is empirically enough time to reduce the disk writes
        // without waiting so long that the user closes the window and
        // the user's last-set size is not saved.
        resize_save_timer_id = window.setTimeout(() => {
            if (!ObjectCompare(size_data, last_saved_size)) {
                saveViewSize(size_data);
            }
        }, K.RESIZE_DEBOUNCE_INTERVAL_MS);
    });
} //eventOnResize

// On a timer, save the window size and position if it has changed.
// We need this because Chrome doesn't give us an event when the TF window
// moves.  To work around this, we poll the window position.
// Inspired by, but not copied from, https://stackoverflow.com/q/4319487/2877364
// by https://stackoverflow.com/users/144833/oscar-godson .
function timedMoveDetector() {
    chrome.windows.get(my_winid, (cwin) => {
        // Update only if window is normal.  If the state or size changed, we will
        // have caught it in eventOnResize.
        if (cwin.state == "normal") {
            let size_data = getCWinGeometry(cwin);
            if (!ObjectCompare(size_data, last_saved_size)) {
                saveViewSize(size_data);
            }
        }
        setTimeout(timedMoveDetector, K.MOVE_DETECTOR_INTERVAL_MS);
    });
} //timedMoveDetector

////////////////////////////////////////////////////////////////////////// }}}1
// Hamburger menu // {{{1

/// Open a new window with the TabFern homepage.
function hamAboutWindow() {
    K.openWindowForURL("https://cxw42.github.io/TabFern/");
} //hamAboutWindow()

/// Reload the TabFern window (or, at least, the tree iframe)
function hamReloadTree() {
    window.location.reload(true);
} //hamReloadTree()

// Record that the user has seen the "what's new" for this version
function userHasSeenSettings() {
    if (ShowWhatIsNew) {
        ShowWhatIsNew = false;

        let to_save = {};
        to_save[K.LASTVER_KEY] = TABFERN_VERSION;
        chrome.storage.local.set(to_save, ignore_chrome_error);
    }
} //userHasSeenSettings()

/// Open the Settings window.  If ShowWhatIsNew, also updates the K.LASTVER_KEY
/// information used by checkWhatIsNew().
function hamSettings() {
    // Actually open the window
    let url = chrome.runtime.getURL(
        "/settings/index.html" + (ShowWhatIsNew ? "#open=last" : "")
    );
    if (url) {
        K.openWindowForURL(url);
    } else {
        log.error("Could not get settings URL");
    }

    userHasSeenSettings();
} //hamSettings()

function hamBackup() {
    let date_tag = new Date().toISOString().replace(/:/g, ".");
    // DOS filenames can't include colons.
    // TODO use local time - maybe
    // https://www.npmjs.com/package/dateformat ?
    let filename = "TabFern backup " + date_tag + ".tabfern";

    // Save the tree, including currently-open windows/tabs, then
    // export the save data to #filename.
    saveTree(true, function (_unused_err, saved_info) {
        Modules.exporter(document, JSON.stringify(saved_info), filename);
    });
} //hamBackup()

/// Restore tabs from a saved backup.  Note that this adds the tabs to those
/// already present.  It does not delete existing tabs/windows.
function hamRestoreFromBackup() {
    /// Process the text of the file once it's loaded
    function processFile(text, filename) {
        let ok;
        try {
            let parsed = JSON.parse(text);
            ok = loadSavedWindowsFromData(parsed);
            if (!ok) {
                const errmsg = _T("errCouldNotLoadFile", filename, e);
                log.warn({ [errmsg]: e });
                window.alert(errmsg);
            }
        } catch (e) {
            const errmsg = _T("errCouldNotParseFile");
            log.warn({ [errmsg + " (exception thrown)"]: e });
            window.alert(errmsg);
        }

        // If we were successful, save.  Otherwise, a reload of the extension
        // before taking another action that triggers a save will result in
        // the Restore never having happened.
        if (ok) {
            saveTree();
        }
    } //processFile()

    try {
        let importer = new Modules.importer(document, ".tabfern");
        importer.getFileAsString(processFile);
    } catch (e) {
        const errmsg = _T("errCouldNotRunImporter", e);
        log.warn({ [errmsg]: e });
        window.alert(errmsg);
    }
} //hamRestoreFromBackup()

function hamRestoreLastDeleted() {
    if (!Array.isArray(lastDeletedWindow) || lastDeletedWindow.length <= 0)
        return;

    // Make v0 save data from the last-deleted-window URLs, just because
    // v0 is convenient, and the backward-compatibility guarantee of
    // loadSavedWindowsFromData means we won't have to refactor this.
    let tabs = [];
    // TODO convert user-facing text to _T()
    for (let url of lastDeletedWindow) {
        tabs.push({ text: "Restored", url: url });
    }
    let dat = [{ text: "Restored window", tabs: tabs }];

    // Load it into the tree
    let wins_loaded = loadSavedWindowsFromData(dat);
    if (typeof wins_loaded === "number" && wins_loaded > 0) {
        // We loaded the window successfully.  Open it, if the user wishes.
        if (S.getBool(S.RESTORE_ON_LAST_DELETED, false)) {
            let root = T.root_node();
            let node_id = root.children[root.children.length - 1];
            T.treeobj.select_node(node_id);
        }
    }

    lastDeletedWindow = [];
} //hamRestoreLastDeleted

function hamExpandAll() {
    T.treeobj.open_all();
} //hamExpandAll()

function hamCollapseAll() {
    T.treeobj.close_all();
} //hamCollapseAll()

/// Make a function to sort the top-level nodes based on #compare_fn
function hamSorter(compare_fn) {
    return function () {
        let arr = T.root_node().children;
        Modules.sorts.stable_sort(arr, compare_fn);
        // children[] holds node IDs, so compare_fn will always get strings.
        T.treeobj.redraw(true); // true => full redraw
    };
} //hamSorter

function hamRunJasmineTests() {
    let url = chrome.runtime.getURL("/t/index.html"); // from /static/t
    if (url) {
        K.openWindowForURL(url);
    } else {
        log.error("Could not get Jasmine-test URL");
    }

    userHasSeenSettings(); // Ergonomics (#233)
} // hamRunJasmineTests

function hamSortOpenToTop() {
    hamSorter(Modules.sorts.open_windows_to_top)(); //do the sort

    if (S.getBool(S.JUMP_WITH_SORT_OPEN_TOP, true)) {
        let h = $("html");
        if (h.scrollTop != 0) h.animate({ scrollTop: 0 });
        // https://stackoverflow.com/a/3442125/2877364 by
        // https://stackoverflow.com/users/415290/todd
    }
} //hamSortOpenToTop()

// You can call proxyfunc with the items or just return them, so we just
// return them.
//
// Note: Only use String, non-Integer, non-Symbol keys in the returned items.
// That way the context menu will be in the same order as the order of the keys
// in the items.  See https://stackoverflow.com/a/32149345/2877364 and
// http://www.ecma-international.org/ecma-262/6.0/#sec-ordinary-object-internal-methods-and-internal-slots-ownpropertykeys
// for details.
//
// @param node
// @returns {actionItemId: {label: string, action: function}, ...}, or
//          false for no menu.
function getHamburgerMenuItems(node, _unused_proxyfunc, e) {
    let items = {};

    // Add development-specific items, if any
    if (is_devel_mode) {
        items.jasmineItem = {
            label: _T("menuJasmineTests"),
            action: hamRunJasmineTests,
            icon: "fa fa-fort-awesome",
            separator_after: true,
        };
    } //endif is_devel_mode

    items.reloadItem = {
        label: _T("menuReload"),
        action: hamReloadTree,
        icon: "fa fa-refresh",
        separator_after: true,
    };

    items.infoItem = {
        label: _T("menuOnlineInfo"),
        title: "The TabFern web site, with a basic usage guide and the credits",
        // TODO also _T() the title fields throughout
        action: hamAboutWindow,
        icon: "fa fa-info",
    };
    items.settingsItem = {
        label: _T("menuSettings"),
        title: "Also lists the features introduced with each version!",
        action: hamSettings,
        icon: "fa fa-cog" + (ShowWhatIsNew ? " tf-notification" : ""),
        // If we have a "What's new" item, flag it
        separator_after: true,
    };

    if (Array.isArray(lastDeletedWindow) && lastDeletedWindow.length > 0) {
        items.restoreLastDeletedItem = {
            label: _T("menuRestoreLastDeleted"),
            action: hamRestoreLastDeleted,
        };
    }

    items.backupItem = {
        label: _T("menuBackupNow"),
        icon: "fa fa-floppy-o",
        action: hamBackup,
    };
    items.restoreItem = {
        label: _T("menuLoadBackupContents"),
        action: hamRestoreFromBackup,
        icon: "fa fa-folder-open-o",
        separator_after: true,
    };

    items.sortItem = {
        label: _T("menuSort"),
        icon: "fa fa-sort",
        submenu: {
            openToTopItem: {
                label: _T("menuSortOpenToTop"),
                title:
                    "Sort ascending by window name, case-insensitive, " +
                    "and put the open windows at the top of the list.",
                action: hamSortOpenToTop,
                icon: "fff-text-padding-top",
            },
            azItem: {
                label: _T("menuSortAZ"),
                title: "Sort ascending by window name, case-insensitive",
                action: hamSorter(Modules.sorts.compare_node_text),
                icon: "fa fa-sort-alpha-asc",
            },
            zaItem: {
                label: _T("menuSortZA"),
                title: "Sort descending by window name, case-insensitive",
                action: hamSorter(Modules.sorts.compare_node_text_desc),
                icon: "fa fa-sort-alpha-desc",
            },
            numItem09: {
                label: _T("menuSort09"),
                title: "Sort ascending by window name, numeric, case-insensitive",
                action: hamSorter(Modules.sorts.compare_node_num),
                icon: "fa fa-sort-numeric-asc",
            },
            numItem90: {
                label: _T("menuSort90"),
                title: "Sort descending by window name, numeric, case-insensitive",
                action: hamSorter(Modules.sorts.compare_node_num_desc),
                icon: "fa fa-sort-numeric-desc",
            },
        }, //submenu
    }; //sortItem

    items.expandItem = {
        label: _T("menuExpandAll"),
        icon: "fa fa-plus-square",
        action: hamExpandAll,
    };
    items.collapseItem = {
        label: _T("menuCollapseAll"),
        icon: "fa fa-minus-square",
        action: hamCollapseAll,
    };

    return items;
} //getHamburgerMenuItems()

////////////////////////////////////////////////////////////////////////// }}}1
// Context menu for the main tree // {{{1

function getMainContextMenuItems(node, _unused_proxyfunc, e) {
    // TODO move this to Bypasser.isBypassed(e)
    if (Bypasser.isBypassed()) {
        return false;
    } else {
        // not bypassed - show jsTree context menu
        e.preventDefault();
    }

    // What kind of node is it?
    let nodeType, val;
    val = D.val_by_node_id(node.id);
    if (!val) return false;

    nodeType = val.ty;

    // --- Context menu for a tab ---

    if (nodeType === K.IT_TAB) {
        let tabItems = {
            toggleBorderItem: {
                label: _T("menuToggleTopBorder"),
                icon: "fa fa-minus",
                action: function () {
                    actionToggleTabTopBorder(node.id, node, null, null);
                },
            },
            editBulletItem: {
                label: _T("menuAddEditNote"),
                icon: "fff-pencil",

                // Use K.nextTickRunner so the context menu can be
                // hidden before actionRenameWindow() calls window.prompt().
                action: K.nextTickRunner(function () {
                    actionEditTabBullet(node.id, node, null, null);
                }),
            },
        };

        if (val.isOpen) {
            tabItems.closeItem = {
                label: "Close and remember",
                icon: "fff-picture-delete",
                action: function () {
                    actionCloseTabAndSave(node.id, node, null, null);
                },
            };
        }

        return tabItems;
    } //endif K.IT_TAB

    // --- Context menu for a window ---

    if (nodeType === K.IT_WIN) {
        let winItems = {};

        winItems.renameItem = {
            label: _T("menuRename"),
            icon: "fff-pencil",

            // Use K.nextTickRunner so the context menu can be
            // hidden before actionRenameWindow() calls window.prompt().
            action: K.nextTickRunner(function () {
                actionRenameWindow(node.id, node, null, null);
            }),
        };

        // Forget/Remember
        if (
            val.isOpen &&
            val.keep === K.WIN_KEEP &&
            !M.isWinPartlyOpen(node.id)
        ) {
            winItems.forgetItem = {
                label: _T("menuForget"),
                title: _T("menuttForget"),
                icon: "fa fa-chain-broken",
                action: function () {
                    actionForgetWindow(node.id, node, null, null);
                },
            };
        }

        if (val.isOpen && val.keep === K.WIN_NOKEEP) {
            winItems.rememberItem = {
                label: _T("menuRemember"),
                title: _T("menuttRemember"),
                icon: "fa fa-link",
                action: function () {
                    actionRememberWindow(node.id, node, null, null);
                },
            };
        }

        if (val.isOpen) {
            winItems.closeItem = {
                label: _T("menuCloseAndRemember"),
                icon: "fff-picture-delete",
                action: function () {
                    actionCloseWindowAndSave(node.id, node, null, null);
                },
            };
        }

        if (M.isWinPartlyOpen(node) && !S.isOROC()) {
            winItems.openAllItem = {
                label: "Open all tabs",
                icon: "fff-application-cascade",
                action: function () {
                    actionOpenRestOfTabs(node.id, node, null, null);
                },
            };
        }

        {
            // If not the first item, add "Move to top"
            let parent_node = T.treeobj.get_node(node.parent);
            if (parent_node.children[1] !== node.id) {
                // children[1], not [0], because [0] is the holding pen.
                winItems.toTopItem = {
                    label: _T("menuMoveToTop"),
                    icon: "fff-text-padding-top",
                    action: () => {
                        actionMoveWinToTop(node.id, node, null, null);
                    },
                };
            }
        }

        winItems.deleteItem = {
            label: _T("menuDelete"),
            icon: "fff-cross",
            separator_before: true,
            action: function () {
                actionDeleteWindow(node.id, node, null, null);
            },
        };

        winItems.urlSubstituteItem = {
            label: _T("menuURLSubstitute"),
            title: _T("menuttURLSubstitute"),
            icon: "arrow-switch",
            separator_before: true,
            action: function () {
                actionURLSubstitute(node.id, node, null, null);
            },
        };

        return winItems;
    } //endif K.IT_WIN

    return false; // if it's a node we don't have a menu for

    //    // Note: Don't return {} --- that seems to cause jstree to not properly
    //    // remove the jstree-context style.  Instead, something like this:
    //    return Object.keys(items).length > 0 ? items : false ;
    //        // https://stackoverflow.com/a/4889658/2877364 by
    //        // https://stackoverflow.com/users/7012/avi-flax
} //getMainContextMenuItems

////////////////////////////////////////////////////////////////////////// }}}1
// Drag-and-drop support // {{{1

/// Determine whether a node or set of nodes can be dragged.
/// This function has to take pinned tabs into account, because we don't
/// get any event from Chrome if we try to move a single pinned tab to the
/// right of a non-pinned tab.  In my tests in Chrome 63, it also appears
/// we don't even get an error message.
///
/// @param {array} nodes The full jstree node record(s) being dragged
/// @param {Object} evt_unused The event (not currently used)
/// @return {boolean} Whether or not the node is draggable
function dndIsDraggable(nodes, evt_unused) {
    if (L.log.getLevel() <= L.log.levels.TRACE) {
        console.group("is draggable?");
        console.log(nodes);
        console.groupEnd();
    }

    /// Are any of the nodes pinned?
    let dragging_pinned_node = false;

    for (let node of nodes) {
        if (!node || !node.id) return false;

        // Can't drag the holding pen.  This shouldn't be an issue, since it's
        // hidden, but I'll leave the check here just in case.
        if (node.id === T.holding_node_id) return false;

        let val = D.val_by_node_id(node.id);
        if (!val) return false;

        // Check tabs for pinned status
        if (val.ty === K.IT_TAB) {
            if (dragging_pinned_node) return false;
            // For now, only permit dragging one pinned tab at a time.
            // TODO relax this later so users can drag groups of adjacent
            // pinned tabs.
            dragging_pinned_node = true;
        }
    } //foreach node

    return true; // Any other node is draggable.
} //dndIsDraggable

/// Determine whether a node is a valid drop target.
/// This function actually gets called for all changes to the tree,
/// so we permit everything except for invalid drops.
///
/// @param operation {string}
/// @param node {Object} The full jstree node record of the node that might
///                      be affected
/// @param new_parent {Object} The full jstree node record of the
///                             node to be the parent
/// @param more {mixed} optional object of additional data.
///
/// @return {boolean} whether or not the operation is permitted
///
var treeCheckCallback = (function treeCheck() {
    /// The move_node callback we will use to remove empty windows
    /// when dragging the last tab out of a window
    function remove_empty_window(evt, data) {
        // Note: data.old_parent is the node ID of the former parent
        if (!data.old_parent) return;
        if (L.log.getLevel() <= L.log.levels.DEBUG) {
            console.group("remove_empty_window");
            console.log(evt);
            console.log(data);
            console.groupEnd();
        }

        // Don't know if we need to delay until the next tick, but I'm going
        // to just to be on the safe side.  This will give T.treeobj.move_node
        // a chance to finish.
        ASQ().val(() => {
            T.treeobj.delete_node(data.old_parent);
        });
    } //remove_empty_window

    /// Move an open tab within its Chrome window, or from an open window
    /// to a closed window.
    function move_open_tab_in_window(evt, data) {
        if (!data.parent || !data.old_parent || !data.node || !data.node.id)
            return;

        // Which tab we're moving
        let val = D.tabs.by_node_id(data.node.id);
        if (!val || val.tab_id === K.NONE) return;

        // Which window we're moving it to
        let dest_win_node_id = data.parent;
        let parent_val = D.windows.by_node_id(dest_win_node_id);
        if (!parent_val) return;

        if (parent_val.isOpen) {
            // Move an open tab from one open window to another (or the same).

            if (parent_val.win_id === K.NONE) return;
            // Chrome fires a onTabMoved after we do this (if it works),
            // so we don't have to update the tree here.
            // As above, delay to be on the safe side.
            ASQ()
                .then((done) => {
                    let ctab_idx = M.chromeIdxOfTab(
                        dest_win_node_id,
                        data.position
                    );
                    L.log.info(
                        `Moving tab ${val.tab_id} pos ${data.position}` +
                            ` => ctab idx ${ctab_idx}`
                    );

                    chrome.tabs.move(
                        val.tab_id,
                        { windowId: parent_val.win_id, index: ctab_idx },
                        ASQH.CC(done)
                    );
                })
                .then((done) => {
                    // It appears that chrome.tabs.move() throws away pinned
                    // status in Chrome 64.  Make sure it is consistent.
                    chrome.tabs.update(
                        val.tab_id,
                        { pinned: !!val.isPinned },
                        ASQH.CC(done)
                    );
                })
                .or((err) => {
                    // Doesn't fire for invalid moves of pinned tabs in Chrome 63
                    L.log.warn({ [`Couldn't move tab ${val.tab_id}`]: err });

                    // TODO #123: If the move failed, put the tree item back
                    // where it was before.  E.g., in Vivaldi, dragging a tab's
                    // tree item from a regular window into the Settings window
                    // moves the tab in the tree, but we get here with message
                    // "Tabs can only be moved to and from normal windows,"
                    // and the tab doesn't actually move in the view.
                });
        } else {
            // Move an open tab to a closed window

            let old_parent_val = D.windows.by_node_id(data.old_parent);
            let old_parent_node = T.treeobj.get_node(data.old_parent);
            if (
                !old_parent_val ||
                old_parent_val.win_id === K.NONE ||
                !old_parent_node
            )
                return;

            // As above, delay to be on the safe side.
            let seq = ASQ();
            let tab_id = val.tab_id;

            // Disconnect the tab first, so onTabRemoved() doesn't
            // delete it after the chrome.tabs.remove() call.
            seq.val(() => {
                D.tabs.change_key(val, "tab_id", K.NONE);
                val.tab = undefined;
                val.win_id = K.NONE;
                val.index = K.NONE;
                val.isOpen = false;
                M.del_subtype(val.node_id, K.NST_OPEN);
                T.treeobj.flag_node(val.node_id, false, true); // clear flag
            });

            // Now that it's disconnected, close the actual tab.
            // We don't have to move the node in jstree --- jstree handles
            // that itself through dnd.
            // TODO update per #79 - need to try to remove the tab first,
            // then see what happens.
            seq.try((done) => {
                chrome.tabs.remove(tab_id, ASQH.CC(done));
                // if tab_id was the last tab in old_parent, onWinRemoved
                // will delete the tree node.  Therefore, we do not have
                // to do so.
            });

            // Whether or not the removal succeeded, update the tab indices
            // on both windows for safety.
            seq.val((result_unused) => {
                M.updateTabIndexValues(data.parent);
                M.updateTabIndexValues(data.old_parent);
            });
        } //endif open parent window else
    } //move_open_tab_in_window

    /// Add a tab to an open window.
    function open_tab_within_window(evt, data) {
        if (!data.parent || !data.old_parent || !data.node || !data.node.id)
            return;

        // Which tab we're moving
        let tab_node_id = data.node.id;
        let moving_val = D.tabs.by_node_id(tab_node_id);
        if (!moving_val) return;

        // Which window we're moving it to
        let dest_win_node_id = data.parent;
        let dest_win_val = D.windows.by_node_id(dest_win_node_id);
        if (!dest_win_val || dest_win_val.win_id === K.NONE) return;

        // Update the index values, so we know which index the
        // tab should have.  The tab node has already been moved, so the
        // index values match what will be the case once the ctab is created.
        ASQ().then((done) => {
            M.updateTabIndexValues(data.parent, [tab_node_id]);
            // [tab_node_id]: Treat the new tab as if it were open when
            // computing index values.  This magically updates
            // moving_val.index.
            M.updateTabIndexValues(data.old_parent);

            moving_val.being_opened = true;
            // so onTabCreated doesn't duplicate it

            let ctab_idx = M.chromeIdxOfTab(dest_win_node_id, moving_val.index);
            L.log.info(
                `Opening tab ${moving_val.tab_id} at ` +
                    `pos ${moving_val.index} => ctab idx ${ctab_idx}`
            );

            let newtab_info = {
                windowId: dest_win_val.win_id,
                url: NEW_TAB_URL + "#" + moving_val.node_id,
                // pass the node ID to the onTabUpdated callback
                index: ctab_idx,
                pinned: !!moving_val.isPinned,
            };

            L.log.info({ "Moving tab": newtab_info });
            chrome.tabs.create(newtab_info, ASQH.CC(done));
        });
        // The Chrome tab and the item will be linked in onTabCreated, so we're done.
    } //open_tab_within_window

    // --- The main check callback ---
    function inner_treeCheckCallback(
        operation,
        node,
        new_parent,
        node_position,
        more
    ) {
        // Fast bail when possible
        if (operation === "copy_node") return false;
        // we can't handle copies at present
        if (operation === "edit") return false;
        // Don't let the user edit node names with F2
        // TODO? post a message to myself to trigger an actionEditBullet

        if (operation !== "move_node") return true;
        // Everything else besides moves doesn't need a check.

        // Don't log checks during initial tree population
        if (did_init_complete && L.log.getLevel() <= L.log.levels.DEBUG) {
            console.group("check callback for " + operation);
            console.log(node);
            console.log(new_parent);
            if (more) console.log(more);
            if (!more || !more.dnd) {
                console.group("Not drag and drop");
                console.debug();
                console.groupEnd();
            }
            console.groupEnd();
        } //logging

        let moving_val = M.get_node_val(node.id);
        if (!moving_val) return false; // sanity check

        let new_parent_val = null;
        if (new_parent.id !== $.jstree.root) {
            new_parent_val = M.get_node_val(new_parent.id);
        }

        // The "can I drop here?" check during DND.  Doesn't implicate the
        // holding pen because you can't drag/drop an invisible node.
        if (more && more.dnd && operation === "move_node") {
            DND_CHECK: if (moving_val.ty === K.IT_WIN) {
                // Dragging windows
                // Can't drop inside another window - only before or after (re. #34)
                if (more.pos === "i") return false;

                // Can't drop other than in the root
                if (new_parent.id !== $.jstree.root) return false;
            } else if (moving_val.ty === K.IT_TAB) {
                // Dragging tabs
                // Tabs: Can drop closed tabs in closed windows, or open tabs
                // in open windows.  Can also drop open tabs to closed windows,
                // in which case the tab is closed.  Can also drop closed tabs
                // to open windows.
                // TODO revisit this when we later permit opening
                // tab-by-tab (#35).

                // Force boolean, just in case.  TODO remove this once I have
                // finished refactoring to the new model.
                if (typeof moving_val.isPinned !== "boolean") {
                    L.log.warn({
                        "Non-boolean moving_val.isPinned": moving_val,
                    });
                    moving_val.isPinned = !!moving_val.isPinned;
                }

                // Check for valid parent
                if (!new_parent_val || new_parent_val.ty !== K.IT_WIN)
                    return false;
                let new_parent_node = T.treeobj.get_node(
                    new_parent_val.node_id
                );
                if (!new_parent_node || !new_parent_node.children) return false;

                if (new_parent_node.children.length < 1) {
                    // Shouldn't happen?
                    L.log.warn({
                        "DND check wrt parent with no children":
                            new_parent_node,
                        new_parent_val,
                        moving_val,
                        more,
                    });
                    return false;
                }

                // Pinning-related checks need the reference node
                if (!more.pos || !more.ref || !more.ref.id) return false;
                let ref_val = D.val_by_node_id(more.ref.id);
                if (!ref_val) return false;

                if (ref_val.ty === K.IT_TAB && more.pos === "i") {
                    return false; // Can't move tabs under tabs
                    // TODO update for #34
                }

                if (
                    ref_val.ty === K.IT_TAB &&
                    more.ref.parent !== new_parent_node.id
                ) {
                    L.log.error(
                        `DND oops: ${more.ref.parent} !== ${new_parent_node.id}`
                    );
                    return false; // shouldn't happen
                }

                if (ref_val.ty === K.IT_WIN) {
                    // Can't drop nodes outside windows
                    if (more.pos !== "i") return false;

                    // The node will become the new first child.  A pinned tab
                    // can be dropped in front anytime, but a non-pinned tab can
                    // only be dropped if there isn't a pinned tab in the window.
                    // The first tab in a window is pinned if there are any
                    // pinned tabs in that window.
                    let new_parent_has_pinned = !!D.tabs.by_node_id(
                        new_parent_node.children[0],
                        "isPinned"
                    );
                    if (new_parent_has_pinned && !moving_val.isPinned)
                        return false;
                    break DND_CHECK; // Don't need any other checks
                } //endif

                if (ref_val.ty !== K.IT_TAB) break DND_CHECK; // future-proofing

                // Prohibit moving pinned tabs to the right of non-pinned tabs,
                // or moving non-pinned tabs to the left of pinned tabs.

                L.log.debug({
                    [`Moving ${
                        moving_val.isPinned ? "pinned" : "non-pinned"
                    } ` +
                    `node ${moving_val.node_id} to ` +
                    `${more.pos === "b" ? "before" : "after"} ` +
                    `${
                        D.tabs.by_node_id(more.ref.id, "isPinned")
                            ? "pinned"
                            : "non-pinned"
                    } node ` +
                    `${more.ref.id}`]: more,
                });

                let first_node = true;
                let last_was_pinned; ///< whether the previous child node was pinned
                let saw_ref = false; ///< whether we have reached the reference
                let has_pinned_group = false;

                let child_idx, child_node_id;
                for (
                    child_idx = 0;
                    child_idx < new_parent_node.children.length;
                    ++child_idx
                ) {
                    child_node_id = new_parent_node.children[child_idx];
                    let child_pinned = !!D.tabs.by_node_id(
                        child_node_id,
                        "isPinned"
                    );
                    // `!!` because it might be undefined

                    if (first_node) {
                        first_node = false;
                        // Remember where we are.  Chrome's invariant is that
                        // there is an optional group of pinned tab(s) before
                        // an optional group of non-pinned tab(s).  Therefore,
                        // a bool suffices to track where we are.
                        // This effectively duplicates the type of the 1st child
                        // to an imaginary 0th child to the left, which makes
                        // things work out OK.
                        last_was_pinned = child_pinned;

                        // Because of the invariant, the very first tab tells
                        // us whether there are any pinned tabs attached to
                        // this window.
                        has_pinned_group = child_pinned;

                        // If there are no pinned tabs, any non-pinned tab can
                        // be dropped anywhere in the window.  Therefore, we
                        // can fast-bail here.
                        if (!has_pinned_group && !moving_val.isPinned) break;

                        // Check the first node, if we're dropping before it.
                        if (child_node_id === more.ref.id && more.pos === "b") {
                            // Can't drop non-pinned before pinned.
                            if (child_pinned && !moving_val.isPinned)
                                return false;

                            // Can drop pinned or nonpinned before nonpinned
                            if (!child_pinned) break;
                        }
                    } //endif first_node

                    let should_check =
                        // We just passed the reference and we're dropping after
                        saw_ref ||
                        // We're at the reference and we're dropping before
                        (child_node_id === more.ref.id && more.pos === "b");

                    if (should_check) {
                        // In the middle of a group, only that type is allowed.
                        if (
                            last_was_pinned === child_pinned &&
                            moving_val.isPinned !== child_pinned
                        )
                            return false;

                        // Now that we've done the check, we don't need to check
                        // any other nodes.
                        // - If we're dropping after (saw_ref), we have done the
                        //   one more node we needed to do after the reference.
                        // - If we're dropping before, we've already checked
                        //   everything we need to, so we're done.
                        saw_ref = false; // mark that we don't need to
                        // check a drop after the last node
                        break;
                    }

                    last_was_pinned = child_pinned;
                    saw_ref = child_node_id === more.ref.id;
                } //foreach child node

                // Special-case check for dropping after the last node.  This
                // isn't checked in the loop above because this is index
                // nchildren, and the loop stops at nchildren-1.
                if (
                    child_idx === new_parent_node.children.length && //ran off the end
                    more.pos === "a" && //dropping after the end
                    saw_ref && //the end was the ref
                    moving_val.isPinned && //moving a pinned tab
                    !last_was_pinned //after a non-pinned tab
                ) {
                    return false;
                }

                L.log.debug(
                    `Move of pinned node ${moving_val.node_id} OK so far`
                );
            } //endif dragging tab

            L.log.debug("OK to drop here");
        } //endif move_node checks

        // The "I'm about to move it here --- OK?" check.  This happens for
        // drag and also for express calls to move_node.
        if (operation === "move_node") {
            if (!more || !more.dnd) {
                // No longer actively dragging
                void 0; // a place to put a breakpoint
            }

            if (L.log.getLevel() <= L.log.levels.DEBUG) {
                console.group("check callback for node move");
                console.log(moving_val);
                console.log(node);
                console.log(new_parent);
                if (more) console.log(more);
                console.groupEnd();
            }

            // Windows: can only drop in root
            if (moving_val.ty === K.IT_WIN) {
                if (new_parent.id !== $.jstree.root) return false;
            } else if (moving_val.ty === K.IT_TAB) {
                let curr_parent_id = node.parent;
                let new_parent_id = new_parent.id;

                if (moving_val.isOpen) {
                    // Can move open tabs between open windows or the
                    // holding pen.  Also, can move open tabs to closed
                    // windows.
                    if (
                        curr_parent_id !== T.holding_node_id &&
                        new_parent_id !== T.holding_node_id &&
                        !new_parent_val
                    )
                        return false;
                } else {
                    // Can move closed tabs to any window
                    if (!new_parent_val) return false;
                }
            }
            L.log.debug("OK to move");
        } //endif move_node

        // If we made it here, the operation is OK.

        // If we're not in the middle of a dnd, this is the conclusion of a
        // move.  Set up to take action once the move completes.
        // The reason() check is because, if we got here because of an event
        // triggered by Chrome itself, there's nothing more to do.
        if (
            operation === "move_node" &&
            (!more || !more.dnd) &&
            T.treeobj.reason() !== "chrome"
        ) {
            let old_parent_node = T.treeobj.get_node(node.parent);
            let old_parent_val = D.windows.by_node_id(node.parent);

            // Focus the dropped node when the drop completes.  Otherwise,
            // jstree's _redraw() scrolls to whatever node was previously
            // focused after the move completes.
            T.treeobj._data.core.focused = node.id;

            // If we are moving an open tab, set up to move the tab in Chrome.
            if (
                moving_val.isOpen &&
                old_parent_node &&
                node.id !== T.holding_node_id &&
                old_parent_node.id !== T.holding_node_id &&
                new_parent.id !== T.holding_node_id
            ) {
                T.treeobj.element.one(
                    "move_node.jstree",
                    move_open_tab_in_window
                );
            }

            // If we are moving a closed tab from a closed window into an
            // open window, set up to open the tab in Chrome.  Moves from
            // open to open do not trigger an open since windows can be
            // partly open.
            if (
                !moving_val.isOpen &&
                new_parent_val &&
                new_parent_val.isOpen &&
                old_parent_val &&
                !old_parent_val.isOpen
            ) {
                T.treeobj.element.one(
                    "move_node.jstree",
                    open_tab_within_window
                );
            }

            // If we are moving the last tab out of a window other than the
            // holding pen, and the tab is closed, set up the window to be
            // deleted once the move completes.
            // If the last tab is open, it is handled below.
            if (
                !moving_val.isOpen &&
                old_parent_node &&
                old_parent_node.children &&
                node.id !== T.holding_node_id &&
                old_parent_node.id !== T.holding_node_id &&
                new_parent.id !== T.holding_node_id &&
                new_parent.id !== old_parent_node.id &&
                old_parent_node.children.length === 1
            ) {
                T.treeobj.element.one("move_node.jstree", remove_empty_window);
            }
        } //endif this is a non-dnd move

        return true;
    } //inner_treeCheckCallback

    return inner_treeCheckCallback;

    // Note on the code that doesn't check for more.dnd:
    // See https://github.com/vakata/jstree/issues/815 - the final node move
    // doesn't come from the dnd plugin, so doesn't have more.dnd.
    // It does have more.core, however.  We may need to save state from an
    // earlier call of this to a later call, but I hope not.

    // Note: if settings.dnd.check_while_dragging is false, we never get
    // a call to this function from the dnd plugin!
})(); //treeCheckCallback

////////////////////////////////////////////////////////////////////////// }}}1
// What's New // {{{1

/// Check whether to show a "what's new" notification.
/// Sets ShowWhatIsNew, used by getHamburgerMenuItems().
/// Function hamSettings() updates the K.LASTVER_KEY information.
function checkWhatIsNew(selector) {
    chrome.storage.local.get(K.LASTVER_KEY, function (items) {
        let should_notify = true; // unless proven otherwise
        let first_installation = true; // ditto

        // Check whether the user has seen the notification
        if (!isLastError()) {
            let lastver = items[K.LASTVER_KEY];
            if (lastver !== null && typeof lastver === "string") {
                first_installation = false;
                if (lastver === TABFERN_VERSION) {
                    // the user has already
                    should_notify = false; // seen the notification.
                }
            }
        } //endif we have a LASTVER_KEY

        if (should_notify) {
            ShowWhatIsNew = true;
            // Put a notification icon on the hamburger
            let i = $(selector + " .jstree-anchor i");
            i.addClass("tf-notification");
            i.one("click", function () {
                i.removeClass("tf-notification");
            });
        }

        if (first_installation) {
            chrome.storage.local.set(
                { [K.LASTVER_KEY]: "installed, but no version viewed yet" },
                function () {
                    ignore_chrome_error();
                    K.openWindowForURL(
                        "https://cxw42.github.io/TabFern/#usage"
                    );
                }
            );
        }
    });
} //checkWhatIsNew

////////////////////////////////////////////////////////////////////////// }}}1
// Chrome message listener // {{{1

function messageListener(request, sender, sendResponse) {
    log.info({ "tree.js got message": request, from: sender });
    if (!request || !request.msg || !sender) {
        return;
    }

    // For now, only accept messages from our extension
    if (!sender.id || sender.id !== chrome.runtime.id) {
        return;
    }

    if (request.msg === MSG_EDIT_TAB_NOTE && !request.response) {
        TAB: if (request.tab_id) {
            let tab_val = D.tabs.by_tab_id(request.tab_id);
            if (!tab_val || !tab_val.isOpen) break TAB;

            ASQH.NowCC((cc) => {
                // Focus the TabFern popup
                chrome.windows.update(my_winid, { focused: true }, cc);
            })
                .then((done) => {
                    // Do the edit (synchronous)
                    actionEditTabBullet(
                        tab_val.node_id,
                        T.treeobj.get_node(tab_val.node_id),
                        null,
                        null
                    );
                    done();
                })
                .then((done) => {
                    // Switch back to the window that was focused
                    chrome.windows.update(
                        tab_val.win_id,
                        { focused: true },
                        ASQH.CC(done)
                    );
                })
                // At one point, the edited tab wasn't being flagged when focus
                // switched back to it, so I tried the below.  I was not able to
                // reproduce the problem consistently, but the below seems to help
                // at least sometimes.  Related to #71.
                .val(() => {
                    T.treeobj.flag_node(tab_val.node_id);
                })
                .val(() => {
                    sendResponse({
                        msg: request.msg,
                        response: true,
                        success: true,
                    });
                })
                .or(() => {
                    // Report any errors back to the sender
                    sendResponse({
                        msg: request.msg,
                        response: true,
                        success: false,
                    });
                });
            return true; // Don't send a response yet - wait for the seq
            // to run.  true => keep sendResponse alive
        }

        // If we didn't kick off the sequence, report failure right away.
        sendResponse({ msg: request.msg, response: true, success: false });
    } //endif MSG_EDIT_TAB_NOTE

    // Ignore all other messages --- don't send a response
} //messageListener

////////////////////////////////////////////////////////////////////////// }}}1
// Helpers // {{{1

/// Delete all nodes for closed windows.  Meant to be used from the console.
/// TODO migrate this into a user-accessible function (#98)
function delete_all_closed_nodes(are_you_sure) {
    if (!are_you_sure) return;

    let root = T.root_node();
    if (!root) return;

    for (let i = root.children.length - 1; i > 0; --i) {
        let child_node_id = root.children[i];
        let isOpen = D.windows.by_node_id(child_node_id, "isOpen");
        if (!isOpen && child_node_id != T.holding_node_id) {
            actionDeleteWindow(
                child_node_id,
                T.treeobj.get_node(child_node_id), //node
                null,
                null, //action
                null,
                true
            ); //event, is_internal
        }
    }
} //delete_all_closed_nodes

////////////////////////////////////////////////////////////////////////// }}}1
// Startup / shutdown details // {{{1

// Initialization routines // {{{2

let custom_bg_color = false;

/// Initialization that happens before the full DOM is loaded
function preLoadInit() {
    next_init_step("preload");
    if (S.getBool(S.HIDE_HORIZONTAL_SCROLLBARS)) {
        document.querySelector("html").classList +=
            " tf--feature--hide-horizontal-scrollbars";
    }

    if (S.getBool(S.SKINNY_SCROLLBARS)) {
        document.querySelector("html").classList += " skinny-scrollbar";
    }

    //Custom skinny-scrollbar color
    CSSC: if (S.getBool(S.SKINNY_SCROLLBARS) && document.styleSheets) {
        let color = S.getString(S.S_SCROLLBAR_COLOR);
        if (!color) {
            log.info("No custom color for skinny scrollbars");
            break CSSC;
        }

        color = Modules.tinycolor(color);
        if (!color.isValid()) {
            log.error({
                "Invalid custom color for skinny scrollbars":
                    color.getOriginalInput(),
            });
            break CSSC;
        }

        let ss = document.styleSheets[document.styleSheets.length - 1];
        for (let state of ["", ":hover", ":active"]) {
            let newrule =
                "html.skinny-scrollbar::-webkit-scrollbar-thumb" +
                `${state} { background: ${color.toRgbString()}; }`;
            ss.insertRule(newrule);
            // html.foo:: is more specific than the default .foo::, so the
            // override works and we don't have to remove the existing rule.
            // Note: color.toRgbString() for formatting consistency.
        }
    } //CSSC

    let url = chrome.runtime.getURL(
        `/assets/jstree/themes/${S.getThemeName()}/style.css`
    );
    let before = document.getElementById("last-stylesheet");
    loadCSS(document, url, before);

    // Load our icons after the jstree theme so they can override the theme
    url = chrome.runtime.getURL("/assets/css/icons.css");
    loadCSS(document, url, before);

    let body = document.querySelector("body");
    if (body) {
        body.classList += ` jstree-${S.getThemeName()}`;
    }

    // Apply custom background, if any.
    // NOTE: need to keep this logic in sync with the validator for
    // S.S_BACKGROUND in src/common/common.js.  TODO remove this duplication.
    BG: if (S.have(S.S_BACKGROUND)) {
        let bg = S.getString(S.S_BACKGROUND, "").trim();

        if (bg.length < 2) break BG; // no valid color is one character

        if (Validation.isValidColor(bg)) {
            custom_bg_color = bg;
            break BG;
        }

        // not a color --- try to parse it as a URL.
        if (
            Validation.isValidURL(bg, [
                "file",
                "https",
                "data",
                "chrome-extension",
            ])
        ) {
            // For now, disallow http so we don't have to worry
            // about HTTP-hijacking attacks.  I don't know of any
            // attack vectors in CSS background images off-hand,
            // but that doesn't mean there aren't any :) .
            custom_bg_color = `url("${bg}")`;
            break BG;
        }
    } //endif have a background setting

    if (custom_bg_color) {
        $("body").css("background", custom_bg_color);
    }
} //preLoadInit

// Beginning of the onload initialization.

/// Check development status in an ASQ step.  Thanks to
/// https://stackoverflow.com/a/12833511/2877364 by
/// https://stackoverflow.com/users/1143495/konrad-dzwinel and
/// https://stackoverflow.com/users/934239/xan
function determine_devel_mode(done) {
    ASQH.NowCC((cc) => {
        chrome.management.getSelf(cc);
    })
        .val((info) => {
            is_devel_mode = info.installType === "development";
        })
        .pipe(done);
} //determine_devel_mode()

/// Initialization we can do before we have our window ID
function basicInit(done) {
    next_init_step("basic initialization");
    log.info("TabFern tree.js initializing view - " + TABFERN_VERSION);

    Hamburger = Modules.hamburger(
        "#hamburger-menu",
        getHamburgerMenuItems,
        K.CONTEXT_MENU_MOUSEOUT_TIMEOUT_MS
    );

    if (custom_bg_color) {
        $("#hamburger-menu").css("background", "transparent");
    }

    checkWhatIsNew("#hamburger-menu");

    initFocusHandler();

    // Stash our current size, which is the default window size.
    // We can't use chrome.windows.get() because we don't have my_winid yet.
    newWinSize = getWindowGeometry(window);

    // TODO? get screen size of the current monitor and make sure the TabFern
    // window is fully visible -
    // chrome.windows.create({state:'fullscreen'},function(win){console.log(win); chrome.windows.remove(win.id);})
    // appears to provide valid `win.width` and `win.height` values.
    // TODO? also make sure the TabFern window is at least 300px wide, or at
    // at least 30% of screen width if <640px.  Also make sure that the
    // TabFern window is tall enough.
    // TODO? Snap the TabFern window to within n pixels of the Chrome window?

    done();
} //basicInit

// Create the jstree
function createMainTree(done, cwin) {
    next_init_step("create main tree");
    const win_id = cwin.id;
    my_winid = win_id;

    // Init the main jstree
    log.info(
        "TabFern tree.js initializing tree in window " + win_id.toString()
    );

    let contextmenu_items = S.getBool(S.ENB_CONTEXT_MENU, true)
        ? getMainContextMenuItems
        : false;

    // Set up to receive resize notifications from item_tree.
    // Do this before calling T.create(), which triggers an initial
    // inner_resize event.
    // TODO? move this into item_tree?
    $(window).on("inner_resize", function (evt, wid) {
        T.rjustify_action_group_at(wid);
    });

    T.create("#maintree", {
        check_callback: treeCheckCallback,
        is_draggable: dndIsDraggable,
        contextmenu_items: contextmenu_items,
    });

    next_init_step("context-menu support");
    Bypasser = Modules.bypasser.create(window, T.treeobj);

    done();
} //createMainTree()

/// Called after ASQ.try(chrome.storage.local.get(LOCN_KEY))
/// @post last_saved_size.winState === 'normal'
function moveWinToLastPositionIfAny_catch(done, items_or_err) {
    // move the popup window to its last position/size.
    // If there was an error (e.g., nonexistent key), just
    // accept the default size.

    next_init_step("reposition window");
    if (ASQH.is_asq_try_err(items_or_err)) {
        log.warn({ "Couldn't get saved location": K.dups(items_or_err) });
        // Note: dups() used to force evaluation at the time of logging
    } else {
        //we have a location
        log.info({ "Got saved location": K.dups(items_or_err) });

        let parsed = items_or_err[K.LOCN_KEY];
        if (!(parsed !== null && typeof parsed === "object")) {
            log.info({ "Could not parse size from": K.dups(items_or_err) });
            parsed = {
                left: 100,
                top: 100,
                width: 500,
                height: 400,
                winState: "normal",
            };
            // Some kind of hopefully-reasonable size
        }

        let size_data = {
            left: +parsed.left || 0,
            top: +parsed.top || 0,
            width: Math.max(+parsed.width || 300, 100),
            // don't let it shrink too small, in case something went wrong
            height: Math.max(+parsed.height || 600, 200),
            // Note: purposefully not updating winState here (#192).
        };
        ASQH.NowCC((cc) => {
            // Resize.  Assumes window is in "normal" state when created.
            chrome.windows.update(my_winid, size_data, cc);
        })
            .then((done, cwin) => {
                // Restore the state, if other than "normal".
                // Docs for chrome.windows.update require this
                // be done separately from setting the size.
                last_saved_size = K.dups(size_data);
                last_saved_size.winState = "normal";
                if (parsed.winState && parsed.winState != "normal") {
                    chrome.windows.update(
                        my_winid,
                        { state: parsed.winState },
                        ASQH.CC(done)
                    );
                } else {
                    done(cwin);
                }
            })
            .val((cwin) => {
                log.info({ "Updated window size/state": cwin });
            })
            .or((err) => {
                log.error({ "Could not update window size/state": err });
            });
    } //endif storage.local.get worked

    // Start polling for moves (without resize) of the TF window
    setTimeout(timedMoveDetector, K.MOVE_DETECTOR_INTERVAL_MS);

    done();
} //moveWinToLastPositionIfAny_catch()

function addOpenWindowsToTree(done, cwins) {
    next_init_step("add open windows to tree");
    let dat = {};
    let focused_win_id;

    for (let cwin of cwins) {
        log.info(
            "Open window " +
                cwin.id +
                (cwin.tabs && cwin.tabs[0] && cwin.tabs[0].title
                    ? ` "${cwin.tabs[0].title}"`
                    : " (no title)")
        );

        if (cwin.focused) {
            focused_win_id = cwin.id;
        }

        if (cwin.id === my_winid) continue;
        // This used to be taken care of by createNodeForWindow,
        // but doing it here is cleaner.

        // TODO? skip popups here and throughout, or handle them better.
        //        if(cwin.type === 'popup') {
        //            log.debug(`Skipping popup window ${cwin.id}`);
        //            continue;
        //        }

        let existing_win = winAlreadyExistsInTree(cwin);
        if (!existing_win || (existing_win.val && existing_win.val.isOpen)) {
            // Doesn't exist, or the duplicate is already open (e.g., if two
            // windows are open with the same set of tabs)
            createNodeForWindow(cwin, K.WIN_NOKEEP);
        } else {
            connectChromeWindowToTreeWindowItem(cwin, existing_win);
        } //endif window already exists
    } //foreach window

    // Highlight the focused window.
    // However, generally the popup will be focused when this runs,
    // and we're not showing the popup in the tree.
    if (focused_win_id) {
        onWinFocusChanged(focused_win_id, true);
    }

    done();
} //addOpenWindowsToTree(done,cwins)

function addEventListeners(done) {
    next_init_step("add event listeners");
    // At this point, the saved and open windows have been loaded into the
    // tree.  Therefore, we can position the action groups.  We already
    // saved the position, so do not need to specify it here.
    log.info({ "initial rjustify all at": T.last_r_edge });
    T.rjustify_action_group_at();

    // And, since we're loaded, make sure we reset these when the tree
    // is redrawn, in whole or in part.

    T.treeobj.element.on("redraw.jstree", function (evt, evt_data) {
        if (!evt_data.nodes) {
            T.rjustify_action_group_at(); // TODO do we need this?
        } else {
            $(evt_data.nodes).each(T.rjustify_node_actions);
        }
    });

    // We need the above, at least on startup, and after removing a closed
    // window from the tree without changing the scrollbar visibility.

    // Set event listeners
    T.treeobj.element.on("changed.jstree", onTreeSelect);
    // TODO why isn't this select_node.jstree?

    T.treeobj.element.on("move_node.jstree", K.nextTickRunner(saveTree));
    // Save after drag-and-drop.  TODO? find a better way to do this?
    // -> Is this redundant now?  I think the saving in the dnd handlers
    // should take care of this.

    T.treeobj.element.on("mmb_node.jstree", (event, node_id) => {
        let node = T.treeobj.get_node(node_id);
        onTreeSelect(event, { node }, { raise_tabfern_after: true });
        // Design decision: do not pass event as part of event_data (2nd
        // param) because middle-clicks shouldn't trigger action buttons.
    });

    chrome.windows.onCreated.addListener(onWinCreated);
    chrome.windows.onRemoved.addListener(onWinRemoved);
    chrome.windows.onFocusChanged.addListener(onWinFocusChanged);

    // Chrome tabs API, listed in the order given in the API docs at
    // https://developer.chrome.com/extensions/tabs
    chrome.tabs.onCreated.addListener(onTabCreated);
    chrome.tabs.onUpdated.addListener(onTabUpdated);
    chrome.tabs.onMoved.addListener(onTabMoved);
    //onSelectionChanged: deprecated
    //onActiveChanged: deprecated
    chrome.tabs.onActivated.addListener(onTabActivated);
    //onHighlightChanged: deprecated
    //onHighlighted: not yet implemented
    chrome.tabs.onDetached.addListener(onTabDetached);
    chrome.tabs.onAttached.addListener(onTabAttached);
    chrome.tabs.onRemoved.addListener(onTabRemoved);
    chrome.tabs.onReplaced.addListener(onTabReplaced);
    //onZoomChange: not yet implemented, and we probably won't ever need it.

    chrome.runtime.onMessage.addListener(messageListener);

    done();
} //addEventListeners

/// The last function to be called after all other initialization has
/// completed successfully.
function initTreeFinal(done) {
    next_init_step("finalize");

    // Tests of different ways of failing init - for debugging only
    //throw new Error("oops");      // DEBUG
    //return;                       // DEBUG - don't save

    if (!was_loading_error) {
        did_init_complete = true;
        // Assume the document is loaded by this point.
        $(K.INIT_MSG_SEL).remove();
        $(K.INIT_PROGRESS_SEL).remove();
        // just in case initialization took a long time, and the message
        // already appeared.

        // If the user wishes, sort the open windows to the top.  Do this only
        // if everything initialized successfully, since hamSortOpenToTop
        // is not guaranteed to work correctly otherwise.
        if (S.getBool(S.OPEN_TOP_ON_STARTUP)) {
            ASQ().val(hamSortOpenToTop);
        }
    } //endif loaded OK

    done();
} //initTreeFinal()

// ---------------------------------------------- }}}2
// Shutdown routines // {{{2

/// Save the tree when TF becomes hidden.  Use this as a `visibilitychange`
/// listener.
function saveTreeOnHide() {
    // This appears to be called reliably.  This will also remove any open,
    // unsaved windows from the save data so they won't be reported as crashed.

    if (!document.hidden) {
        // Not hiding --- nothing to do
        return;
    }

    if (did_init_complete) {
        try {
            saveTree(false); // false => don't save visible, non-saved windows
        } catch (e) {
            console.info(`Could not save tree: ${e}`);
            // Nothing else we can do here --- we're on the way out.
            // This catches, e.g., "extension context invalidated" errors
            // on extension reload.
        }
    }
} //saveTreeOnHide()

// ---------------------------------------------- }}}2
// Error reporting // {{{2

/// Show a warning if initialization hasn't completed.
function initIncompleteWarning() {
    if (!did_init_complete) {
        // Assume the document is loaded by this point.
        if (K && K.INIT_MSG_SEL) {
            $(K.INIT_MSG_SEL).css("display", "block");
        } else {
            window.setTimeout(initIncompleteWarning, 500);
        }

        if (K && K.INIT_PROGRESS_SEL) {
            $(K.INIT_PROGRESS_SEL).css("display", "block");
        } else {
            window.setTimeout(initIncompleteWarning, 500);
        }
    }
} //initIncompleteWarning()

// }}}2

//////////////////////////////////////////////////////////////////////// }}}1
// MAIN // {{{1

/// The main function.
function main() {
    local_init();

    //$(K.INIT_PROGRESS_SEL).css('display','block');  //DEBUG
    $(K.INIT_PROGRESS_SEL).text("waiting for browser");

    // Timer to display the warning message if initialization doesn't complete
    // quickly enough.
    window.setTimeout(initIncompleteWarning, K.INIT_TIME_ALLOWED_MS);

    preLoadInit();

    // Main events
    document.addEventListener("visibilitychange", saveTreeOnHide);
    window.addEventListener("resize", eventOnResize);
    // This doesn't detect window movement without a resize, which is why
    // we have timedMoveDetector above.

    // Run the main init steps once the page has loaded
    let s = ASQ();
    let go = s.errfcb(); // To kick off s.
    callbackOnLoad(go.bind(go, null)); // null => success

    // Start a spinner if loading takes more than 1 s
    let spinner = new Modules.spin.Spinner();
    let spin_starter = function () {
        if (spinner) spinner.spin($("#tabfern-container")[0]);
    };

    s.then(determine_devel_mode)
        .then(basicInit)

        .val(spin_starter)
        // for now, always start --- loadSavedWindowsIntoTree is synchronous

        .then((done) => {
            next_init_step("get window ID");
            chrome.windows.get(chrome.windows.WINDOW_ID_CURRENT, ASQH.CC(done));
        })
        .then(createMainTree)

        .try((done) => {
            next_init_step("get saved location");
            // Find out where the view was before, if anywhere
            chrome.storage.local.get(K.LOCN_KEY, ASQH.CC(done));
        })
        .then(moveWinToLastPositionIfAny_catch)

        .then(loadSavedWindowsIntoTree)
        .then((done) => {
            next_init_step("get open windows");
            chrome.windows.getAll({ populate: true }, ASQH.CC(done));
        })
        .then(addOpenWindowsToTree)
        .then(addEventListeners)
        .then(initTreeFinal)

        .val(check_init_step_count)

        // Stop the spinner, if it started
        .val(() => {
            spinner.stop();
            spinner = null;
        })

        .or((err) => {
            $(K.INIT_MSG_SEL).text($(K.INIT_MSG_SEL).text() + "\n" + err);

            if (spinner) {
                spinner.stop();
                spinner = null;
            }

            log.error(err);
        });
} // main()

main(); // Do it, Rockapella!
// }}}1

// ###########################################################################

//TODO test what happens when Chrome exits.  Does the background page need to
//save anything?

// Notes:
// can get T.treeobj from $(selector).data('jstree')
// can get element from T.treeobj.element

// vi: set fo-=ro foldmethod=marker: //     // END of win/main_tl.js
