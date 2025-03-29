// ffize.js: Make a Firefox manifest and tree from the built Chrome dir
// cxw42, 2018--2019.

var fs = require("fs-extra");

// Copy the whole `public` tree into a fresh `public-ff`.
fs.removeSync("public-ff");
fs.copySync("public", "public-ff");

// Read the Chrome manifest
var manifest = require("../public/manifest.json");

// Munge
delete manifest["version_name"];
delete manifest["offline_enabled"];
delete manifest["options_page"];
delete manifest["background"]["persistent"];

// Add the Add-on ID so localStorage will persist
manifest.browser_specific_settings = {
    gecko: {
        id: "{262561cf-8570-4815-9464-0152a0fde25c}",
    },
};

var idx = manifest["permissions"].indexOf("chrome://favicon/");
if (idx > -1) {
    manifest["permissions"].splice(idx, 1);
}

// Write it back out
fs.writeFileSync("public-ff/manifest.json", JSON.stringify(manifest));
console.log("Wrote public-ff");
