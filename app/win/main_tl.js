// app/win/main_tl.js

let Modules = require('win/main_deps');
let { ASQ, ASQH } = Modules;
let log = Modules.loglevel;
log.setLevel(log.levels.INFO);

/// Output //////////////////////////////////////////////////////////////////
let output_ul = $('<ul>').appendTo('body');
function output(text) {
    output_ul.append($('<li>').html(text));
    return text;
}

output(`Hello, world! from ${__filename}`);

/// Util ////////////////////////////////////////////////////////////////////

/// Ignore a Chrome callback error, and suppress Chrome's
/// `runtime.lastError` diagnostic.  Use this as a Chrome callback.
function ignore_chrome_error() { void chrome.runtime.lastError; }

/// Invoke a callback only when the document is loaded.  Does not pass any
/// parameters to the callback.
function callbackOnLoad(callback)
{
    if(document.readyState !== 'complete') {
        // Thanks to https://stackoverflow.com/a/28093606/2877364 by
        // https://stackoverflow.com/users/4483389/matthias-samsel
        window.addEventListener('load', callback, { 'once': true });
    } else {
        window.setTimeout(callback, 0);    //always async
    }
} //callbackOnLoad

/// Detecting extra tabs ////////////////////////////////////////////////////

/// HACK to not prune windows we create!
var do_not_prune_right_now = false;

/// DOUBLE HACK to not prune, even if pruning is enabled!  INTERNAL DEBUG only.
var pruning_will_not_actually_take_place = true;

/// Check the tabs in the window to make sure they match what we expect,
/// and prune any we don't expect.
/// This is because sometimes Chrome opens extra tabs but doesn't tell the
/// chrome.windows.create callback about them.
/// See https://bugs.chromium.org/p/chromium/issues/detail?id=762951 .
/// See also commit 70638829e5c35a8c86b556dc62ddb3920e4a5e92,
/// at tabfern/src/view/tree.js:997.
///
/// @param cwin The Chrome window
/// @param expected_tab_count {Number}  How many tabs to keep, or 0 to leave
///             the window empty except for a chrome://newtab.
function pruneWindow(cwin, expected_tab_count)
{
    if(!cwin || +expected_tab_count < 0 || do_not_prune_right_now) return;
    let count = +expected_tab_count || 1;   // 0 => one tab

    ASQH.NowCC( (cc)=>{ chrome.windows.get(cwin.id, {populate: true}, cc); } )

    .or((err)=>{
        log.warn(output(`${cwin.id}: Could not get tabs in window: ${err}`));
    })

    .then( (done, inner_cwin)=>{

        if(inner_cwin.tabs.length === 0) {
            //chrome.tabs.create( {windowId: inner_cwin.id, index: 0} );
            done.fail(output(`${inner_cwin.id}: I cannot check for pruning in zero-tab window`));
            return;
        }

        //let win_val = D.windows.by_win_id(inner_cwin.id);

        // Make sure the first tab is a new tab, if desired.
        // However, if this is a saved window, don't mess with tab 0.
        if( expected_tab_count === 0 //&&
            //!(win_val && win_val.keep === K.WIN_KEEP)
        ) {
            // Note: this is problematic if the last window to be open was a
            // saved window, since this races against the merge check in
            // tabOnCreated.  That is the reason for pruneWindowSetTimer().
            let tabid = inner_cwin.tabs[0].id;

            let seq = ASQ();    // for error reporting
            // Don't change chrome: URLs, since those might be things
            // like History (Ctl+H).
            if(!inner_cwin.tabs[0].url.match(/^chrome:/i)) {
                log.warn(output(`<b>Setting tab ${tabid} to chrome:newtab</b>`));
                if(!pruning_will_not_actually_take_place) {
                    chrome.tabs.update(tabid, {url: 'chrome://newtab'},
                            ASQH.CCgo(seq));
                }
            }
            // Currently we don't have anything else to do, so there's no
            // seq.then() calls.  However, using seq still causes asynquence
            // to report any errors in the chrome.tabs.update() call.

        } //endif the caller wanted tab 0 === chrome://newtab

        if(inner_cwin.tabs.length <= count) {
            done();     // No need to prune --- we're done
            return;
        }

        log.warn(output('<b>Win ' + inner_cwin.id + ': expected ' +
                count + ' tabs; got ' +
                inner_cwin.tabs.length + ' tabs --- pruning.</b>'));

        let to_prune=[];

        // Assume that the unexpected tabs are all at the right-hand
        // end, since that's the only behaviour I've observed.

        for(let tab_idx = count;
            tab_idx < inner_cwin.tabs.length;
            ++tab_idx) {
            to_prune.push(inner_cwin.tabs[tab_idx].id);
        } //foreach extra tab

        log.warn(output('Pruning ' + to_prune));
        if(!pruning_will_not_actually_take_place) {
            chrome.tabs.remove(to_prune, ASQH.CC(done));
        }
    })

    .or((err)=>{
        log.warn({'Could not prune tabs in window': cwin, err});
        output(`Could not prune tabs in ${cwin}: ${err}`);
    })
    ;
} //pruneWindow

function winOnCreated(cwin)
{
    log.info({'Window created': cwin.id,
                cwin
            });
    output(`${cwin.id}: Window created`);

    // See how many tabs we have at the moment
    ASQH.NowCC( (cc)=>{ chrome.windows.get(cwin.id, {populate: true}, cc); } )
    .val((inner_cwin)=>{
        log.info(output(`${inner_cwin.id} from ${cwin.id}: after create/query, has ${inner_cwin.tabs.length} tabs`));
        log.info(inner_cwin);
    })
    .or((err)=>{
        log.warn(output(`${cwin.id}: Could not get tabs in window: ${err}`));
    });

    setTimeout(()=>{
        pruneWindow(cwin, 0);   // 0 => expect it to have only chrome://newtab
    }, 500);    // Arbitrary timeout to give the tabs a chance to load
} //winOnCreated

/// MAIN ////////////////////////////////////////////////////////////////////

callbackOnLoad(()=>{
    chrome.windows.onCreated.addListener(winOnCreated);
});

// vi: set ts=4 sts=4 sw=4 et ai fo-=ro foldmethod=marker: //
