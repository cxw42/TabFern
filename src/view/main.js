// main.js: main script for src/view/index.html.
// Part of TabFern.  Copyright (c) cxw42, r4j4h, 2017.

/// Modules loaded via requirejs
let Modules = {};

/// HACK - a global for loglevel because typing `Modules.log` everywhere is a pain.
let log;

/// The tree window itself.  REMINDER: Don't access window.frames until the
/// document is fully loaded (after onload)
let W;

//////////////////////////////////////////////////////////////////////////
// MAIN //

function domOnMessage(evt)
{
    console.log({got:evt.data, from:evt.origin});
}

function initMain()
{
    window.addEventListener('message',domOnMessage);
    W = window.frames[0];
    // Thanks to https://stackoverflow.com/a/13913943/2877364 by
    // https://stackoverflow.com/users/1105384/shank
}

//////////////////////////////////////////////////////////////////////////
// MAIN //

/// require.js modules used by this file
let dependencies = [
    'jquery', 'split', 'loglevel'
];

function main(...args)
{
    // Hack: Copy the loaded modules into our Modules global
    for(let depidx = 0; depidx < args.length; ++depidx) {
        Modules[dependencies[depidx]] = args[depidx];
    }

    log = Modules.loglevel;
    log.setDefaultLevel(log.levels.DEBUG);  // TODO set to WARN for production

    console.log({"parent check main":window.parent===window});

    // Main events
    //window.addEventListener('unload', shutdownTree, { 'once': true });

    // Fire off the main init
    if(document.readyState !== 'complete') {
        // Thanks to https://stackoverflow.com/a/28093606/2877364 by
        // https://stackoverflow.com/users/4483389/matthias-samsel
        window.addEventListener('load', initMain, { 'once': true });
    } else {
        window.setTimeout(initMain, 0);    //always async
    }
} // main()

require(dependencies, main);

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
