// win/container.js: main script for win/container.html.
// Part of TabFern.  Copyright (c) cxw42, r4j4h, 2017--2018.

console.log("TabFern: running " + __filename);

module.exports = {};
// main doesn't provide access to any functions currently

if (false) {
    // Vendor files - listed here only so they'll be bundled
    require("vendor/common"); // for _T(), callbackOnLoad()
    require("process/browser"); // for #100
}

const log = require("loglevel");

//////////////////////////////////////////////////////////////////////////
// INIT //

function initMain() {
    console.log("TabFern container.js onload");
    document.title = `${_T("wsShortName")} (v${TABFERN_VERSION})`;
} //initMain

//////////////////////////////////////////////////////////////////////////
// MAIN //

log.setDefaultLevel(log.levels.WARN);
callbackOnLoad(initMain);

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
