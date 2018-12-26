// ffize.js: Make a Firefox manifest from the built Chrome manifest
// cxw42, 2018.

var fs = require('fs-extra');

// Copy the whole `public` tree into a fresh `public-ff`.
fs.removeSync('public-ff');
fs.copySync('public','public-ff');

// Read the Chrome manifest
var manifest = require('./public/manifest.json');

// Munge
delete manifest['version_name'];
delete manifest['offline_enabled'];
delete manifest['options_page'];
delete manifest['background']['persistent'];

var idx = manifest['permissions'].indexOf('chrome://favicon/');
if(idx > -1) {
    manifest['permissions'].splice(idx,1);
}

// Write it back out
fs.writeFileSync('./public-ff/manifest.json', JSON.stringify(manifest));
