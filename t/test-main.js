// t/test-main.js: main script for test/index.html.
// Part of TabFern.  Copyright (c) cxw42 2017--2018.

module.exports = {};
// test-main doesn't provide access to any functions currently

if (false) {
    // Vendor files - listed here only so they'll be bundled
    require("vendor/validation");
    require("vendor/common");
    require("./lib/jasmine-2.9.1/jasmine");
    require("./lib/jasmine-2.9.1/jasmine-html");
    require("./lib/jasmine-2.9.1/boot");
}

// Plugins
require("./lib/jasmine2-custom-message");

// lib/ and vendor/
require("./spec/spec-asq");
require("./spec/spec-validation");
require("./spec/spec-multidex");
require("./spec/spec-jstree");
require("./spec/spec-jstree-multitype");

// app/ (lower-level functions)
require("./spec/spec-setting-definitions");
require("./spec/spec-setting-accessors");

// app/ (higher-level functions)
require("./spec/app-win-model");

// vi: set ts=4 sts=4 sw=4 et ai fo-=ro: //
