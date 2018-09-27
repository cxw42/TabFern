// test/test-main.js: main script for test/index.html.
// Part of TabFern.  Copyright (c) cxw42 2017--2018.

module.exports = {};
    // test-main doesn't provide access to any functions currently

if(false) { // Vendor files - listed here only so they'll be bundled
    require('vendor/validation');
    require('vendor/common');
    require('./lib/jasmine-2.9.1/jasmine');
    require('./lib/jasmine-2.9.1/jasmine-html');
    require('./lib/jasmine-2.9.1/boot');
}

require('./lib/jasmine2-custom-message');

require('./lib/asyncinator.js');

require('./spec/spec-asyncinator');
require('./spec/spec-asq');
require('./spec/spec-validation');
require('./spec/spec-multidex');
require('./spec/spec-jstree');
require('./spec/spec-jstree-multitype');
require('./spec/spec-view-model');

//const $ = require('jquery');
//const split = require('lib/split-cw');
//const log = require('loglevel');

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
