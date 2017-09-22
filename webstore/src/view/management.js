// management.js: Test of a management module.
// Copyright (c) Chris White 2017.  CC-BY-SA 4.0 International.
// Load this using the async plugin,
// https://github.com/millermedeiros/requirejs-plugins/blob/master/src/async.js

// Code to check development status thanks to
// https://stackoverflow.com/a/12833511/2877364 by
// https://stackoverflow.com/users/1143495/konrad-dzwinel and
// https://stackoverflow.com/users/934239/xan

(function(root){

    /// The completion callback - call when the module is fully loaded
    let callback;

    /// Our worker function
    function with_info(info)
    {
        let obj = info;
        obj.isDevelMode = (info.installType === 'development');
        console.log({'Got info': obj});
        callback(obj);      //complete module loading
    } //with_info

    // Stash the onload callback for later, when we are done loading
    // Thanks to https://stackoverflow.com/a/22745553/2877364 by
    // https://stackoverflow.com/users/140264/brice for
    // info about document.currentScript.
    if(!document.currentScript)
        throw new Error("Can't load --- I don't know what script I'm in");

    // VVV code from here to "^^^" is also available as CC-BY 4.0 International

    script_url = document.currentScript.src;

    let url = new URL(script_url);
    let searchParams = new URLSearchParams(url.hash.slice(1));
        // Using the hash, not the query string, because Chrome won't load
        // chrome-extension resources with query strings.

    if(searchParams.has('callback')) {
        let cbk_name = searchParams.get('callback');
        callback = root[cbk_name];
        if(!callback) throw new Error(
                `Can't load --- I can't find the ${cbk_name} callback`);

    } else {
        throw new Error("Can't load --- I can't find a #callback=... param");
    }

    // ^^^

    // Fire off the loading
    chrome.management.getSelf(with_info);

})(this);
// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
