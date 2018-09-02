// main.js: main script for src/view/index.html.
// Part of TabFern.  Copyright (c) cxw42, r4j4h, 2017.

/// Modules loaded via requirejs
let Modules = {};

/// HACK - a global for loglevel because typing `Modules.log` everywhere is a pain.
let log;

/// The tree window itself.  REMINDER: Don't access window.frames until the
/// document is fully loaded (after onload)
let W;

/// A variable that tree.html can access via window.parent (`var`, not `let`)
var hello='world';

//////////////////////////////////////////////////////////////////////////
// PLUGINS //

function testCrossLoad()
{
    let pc = document.getElementById('plugin-container');
    pc.textContent = '';     // remove the "Dummy content!" text
    let iframe = document.createElement('iframe');
    iframe.onload=function(){console.log('iframe onload');};
    iframe.src = "chrome-extension://kcbahbchkakjkbgnabchdbeccldkaaah/tfplugin/index.html";
    console.log('About to append child');
    pc.appendChild(iframe);
    console.log('Child appended');
}

//////////////////////////////////////////////////////////////////////////
// SPLIT //

let split;

function doSplit()
{
    if(!!split) {
        split.collapse(1);      // close #plugin-container
        split.destroy();
        split = undefined;
        //$('#tabfern-container').css('padding-top','0');
    } else {
        let tree=$('#tree-container');
        let plugin=$('#plugin-container');

        split = Modules['split'](
                [tree[0], plugin[0]],
                {   direction: 'vertical',
                }
        );

        window.setTimeout(testCrossLoad, 100);
    }
} //doSplit

//////////////////////////////////////////////////////////////////////////
// INIT //

function initMain()
{
    console.log('TabFern main.js onload');
    W = window.frames[0];
        // Thanks to https://stackoverflow.com/a/13913943/2877364 by
        // https://stackoverflow.com/users/1105384/shank
    document.title = `${_T('wsShortName')} (v${TABFERN_VERSION})`;
} //initMain

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

    callbackOnLoad(initMain);
} // main()

require(dependencies, main);

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
