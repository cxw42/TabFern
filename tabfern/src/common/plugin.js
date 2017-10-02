// plugin.js: Functions for managing TabFern plugins
// Copyright (c) 2017 Chris White, Jasmine Hegman.

(function (root, factory) {
    let imports=['loglevel', 'asq.src', 'base64js.min'];

    if (typeof define === 'function' && define.amd) {
        // AMD
        define(imports, factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        let requirements = [];
        for(let modulename of imports) {
            requirements.push(require(modulename));
        }
        module.exports = factory(...requirements);
    } else {
        // Browser globals (root is `window`)
        let requirements = [];
        for(let modulename of imports) {
            requirements.push(root[modulename]);
        }
        root.TabFernPlugin = factory(...requirements);
    }
}(this, function (log, ASQ, base64js) {
    "use strict";

    /// The module we are creating
    let module = {};

    // Note for possible future use: arbitrary-base conversion example by
    // https://github.com/MadLittleMods is at
    // https://jsfiddle.net/MadLittleMods/b4xos0w8/ .  License unknown.

    /// Get the string plugin ID for a plugin based on its indexUrl.
    /// Thanks to
    /// @param str_indexUrl {string}
    /// @return an ASQ sequence that will receive the hash as a base64 string.
    module.get_plugin_id = function(str_indexUrl)
    {
        return ASQ()
        .then(function(done) {
            if(typeof str_indexUrl !== 'string')
                throw new Error('str_indexUrl must be a string; got ' +
                                    (typeof str_indexUrl));

            // Thanks to https://github.com/diafygi/webcrypto-examples
            let enc = new TextEncoder('utf-8');
            let ui8a_data = enc.encode('' + str_indexUrl);
            let p = window.crypto.subtle.digest({ name:"SHA-256" }, ui8a_data);
            p.then(done, done.fail);    // promise completion moves the sequence
        })
        .then(function(done, arrbuf_hash) {
            let ui8a_hash = new Uint8Array(arrbuf_hash);
            done(base64js.fromByteArray(ui8a_hash));
        });
    } //get_plugin_id

    /// Check that an SK_PLUGINS record has the right general structure
    module.isValidPluginData = function(items)
    {
        return (isObject(items) && items.version === 1 && isObject(items.plugins));
    }

    /// Make sure the SK_PLUGIN data exists
    module.initPluginDataIfMissing = function()
    {
        ASQ().then(function(done){
            chrome.storage.local.get(SK_PLUGINS, CC(done));
        })
        .then(function(done, items){
            if(!items[SK_PLUGINS] || !module.isValidPluginData(items[SK_PLUGINS]))
                throw '';   // trigger the or() - content doesn't matter
            done();
        })
        .or(function(){
            // We didn't have the right data, so start fresh.
            chrome.storage.local.set(
                {[SK_PLUGINS]:{version:1, plugins:{}}},
                function(){
                    if(typeof(chrome.runtime.lastError) !== 'undefined')
                        throw new Error(chrome.runtime.lastError);
                });
        });
    } //initPluginDataIfMissing

    return module;
}));

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
