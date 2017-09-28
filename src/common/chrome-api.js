// common/chrome-api.js: Selector for access to the Chrome API from an iframe,
// or via the parent window.  NOTE: the parent window must provide a
// chrome_api object.
// Load this via the async plugin.
// Copyright (c) 2017 Chris White, Jasmine Hegman.

(function (root){
    "use strict";

    /// The completion callback - call when the module is fully loaded
    let callback;

    /// Return the parent's chrome_api.  Call once the parent is loaded.
    function return_chrome_api()
    {
        console.log({'Got parent chrome_api':window.parent.chrome_api});
        callback(window.parent.chrome_api);     //complete module loading
    } //return_chrome_api

    //////////////////////////////////////////////////////////////////////////
    // Get the callback

    let script_url = document.currentScript.src;

    let url = new URL(script_url);
    let searchParams = new URLSearchParams(url.hash.slice(1));
        // Using the hash, not the query string, because Chrome won't load
        // chrome-extension resources with query strings.

    let cbk_name;
    if(searchParams.has('callback')) {
        cbk_name = searchParams.get('callback');
    } else {
        cbk_name = 'async_loader_callback_forced_id';
        //throw new Error("Can't load --- I can't find a #callback=... param");
    }

    callback = root[cbk_name];
    if(!callback) throw new Error(
            `Can't load --- I can't find the ${cbk_name} callback`);

    //////////////////////////////////////////////////////////////////////////
    // Main

    if(window.parent === window) {      // not an iframe
        callback(chrome);
    } else {                            // in an iframe - check the parent
        // Fire off the main init
        if(window.parent.document.readyState !== 'complete') {
            // Thanks to https://stackoverflow.com/a/28093606/2877364 by
            // https://stackoverflow.com/users/4483389/matthias-samsel
            window.parent.addEventListener('load', return_chrome_api,
                { 'once': true });
        } else {
            return_chrome_api();
        }
    }

})(this);

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
