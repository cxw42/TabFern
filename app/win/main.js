// main.js: main script for src/view/index.html.
// Part of TabFern.  Copyright (c) cxw42, r4j4h, 2017.

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([ 'jquery', 'split', 'loglevel' ],factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory(require('jquery'), require('split'),
            require('loglevel'));
    } else {
        // Browser globals (root is window)
        root.Multidex = factory(root.$, root.split, root.log);
    }
}(this, main));

function main($, split, log) {

/// Modules loaded via requirejs
let Modules = {};

/// The tree window itself.  REMINDER: Don't access window.frames until the
/// document is fully loaded (after onload)
let W;

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

let the_split;

function doSplit()
{
    if(!!the_split) {   // Close the split
        the_split.collapse(1);      // close #plugin-container
        the_split.destroy();
        the_split = undefined;
        //$('#tabfern-container').css('padding-top','0');

    } else {            // Open the split
        let tree=$('#tree-container');
        let plugin=$('#plugin-container');

        the_split = split(
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

    window.doSplit = doSplit;    // export doSplit so tree.js can call it
} //initMain

//////////////////////////////////////////////////////////////////////////
// MAIN //

log.setDefaultLevel(log.levels.WARN);
callbackOnLoad(initMain);

return {};    // main doesn't provide access to any functions currently

} //main

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
