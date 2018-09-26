// win/container.js: main script for win/container.html.
// Part of TabFern.  Copyright (c) cxw42, r4j4h, 2017--2018.

module.exports = {};
    // main doesn't provide access to any functions currently

if(false) { // Vendor files - listed here only so they'll be bundled
    require('vendor/validation');
    require('vendor/common');
}

const $ = require('jquery');
const split = require('lib/split-cw');
const log = require('loglevel');

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

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
