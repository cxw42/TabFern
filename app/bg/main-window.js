// app/bg/main-window.js: service-worker code to open the main window
// CC-BY-SA 3.0

if (false) {
    // Vendor files - listed here only so they'll be bundled
    require("vendor/common");
}

let ASQH = require("lib/asq-helpers");

const WIN_URL = chrome.runtime.getURL("win/container.html");

// Actually open the view, i.e., the main TF window
function _loadView() {
    ASQH.NowCC((cbk) => {
        console.log("TabFern: Opening view");
        chrome.windows.create(
            {
                url: WIN_URL,
                type: "popup",
                left: 10,
                top: 10,
                width: 200,
                height: 200,
                //'focused': true
                // Note: `focused` is not supported on Firefox, but
                // focused=true is usually the effect.
                // https://bugzilla.mozilla.org/show_bug.cgi?id=1253129
                // However, Firefox does support windows.update with focused.
            },
            cbk
        );
    })
        .then((done, cwin) => {
            chrome.windows.update(cwin.id, { focused: true }, ASQH.CC(done));
        })
        .or((err) => {
            console.error(`Could not open TF window: ${err}`);
        });
} //_loadView()

// Focus the view if it's open, or else load the view.
function raiseOrLoadView() {
    ASQH.NowCC((cbk) => {
        console.log("TabFern: Raising or opening view");
        chrome.tabs.query({ windowType: "popup" }, cbk);
    })
        .then((done, tabs) => {
            let shouldLoad = true;
            for (const tab of tabs) {
                if (tab.url === WIN_URL) {
                    chrome.windows.update(
                        tab.windowId,
                        { focused: true },
                        ignore_chrome_error
                    );
                    shouldLoad = false;
                    break;
                }
            }

            // Not already open --- let _loadView do the work.
            if (shouldLoad) {
                _loadView();
            }
            done();
        })
        .or((err) => {
            console.error(`Could not open TF window: ${err}`);
        });
} //raiseOrLoadView()

/// Move the TabFern window to #reference_ctab.  This helps if the
/// TabFern window winds up off-screen.
/// This is called as a chrome.action.onClicked callback.
function bringToTab(reference_ctab) {
    function clip(x, lo, hi) {
        if (hi < lo) hi = lo;
        return Math.min(hi, Math.max(lo, x));
    }

    if (isLastError()) {
        console.info(chrome.runtime.lastError);
        return;
    }

    let tf_cwin;

    // Find the TF window
    ASQH.NowCC((cbk) => {
        chrome.tabs.query({ windowType: "popup" }, cbk);
    })
        .then((done, tabs) => {
            for (const tab of tabs) {
                if (tab.url === WIN_URL) {
                    chrome.windows.get(tab.windowId, ASQH.CC(done));
                    return;
                }
            }
            // Else not open --- nothing to do.
        })
        .then((done, view_cwin) => {
            tf_cwin = view_cwin;

            // Now get the reference tab
            chrome.windows.get(reference_ctab.windowId, ASQH.CC(done));
        })
        .then((done, reference_cwin) => {
            let updates = {
                left: reference_cwin.left + 16,
                top: reference_cwin.top + 16,
                state: "normal", // not minimized or maximized
            };

            // Don't let it be too large or too small
            updates.width = clip(tf_cwin.width, 200, reference_cwin.width - 32);
            updates.height = clip(
                tf_cwin.height,
                100,
                reference_cwin.height - 32
            );

            chrome.windows.update(tf_cwin.id, updates, ASQH.CC(done));
        });
    // TODO handle Chrome error?
} //bringToTab()

module.exports = {
    raiseOrLoadView,
    bringToTab,
};
