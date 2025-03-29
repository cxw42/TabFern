// tools/zip.js: ZIP up the brunch-built TabFern.
// cxw42, 2018.  Modified from the samples at
// https://github.com/archiverjs/node-archiver and
// https://github.com/archiverjs/node-archiver/issues/185 .

// require modules
var fs = require("fs");
var archiver = require("archiver");

var me = require("../package.json");

// create a file to stream archive data to.
const fn = `${__dirname}/../webstore-${me.version}.zip`;
var output = fs.createWriteStream(fn);

var archive = archiver("zip", {
    zlib: { level: 9 }, // Sets the compression level.
});

// listen for all archive data to be written
// 'close' event is fired only when a file descriptor is involved
output.on("close", function () {
    console.log(`Made ${fn} - ${archive.pointer()} bytes`);
});

// good practice to catch this error explicitly
archive.on("error", function (err) {
    throw err;
});

// pipe archive data to the file
archive.pipe(output);

// ZIP the contents of public/, except for the development material.
archive.glob(
    "**/*", // with respect to the cwd in the next argument
    {
        cwd: "public", // https://github.com/archiverjs/node-archiver/issues/221#issuecomment-360070387
        ignore: [
            "**/*.map", // Source maps
            "t/**",
            "_locales/*.txt",
        ],
    },
    {}
);

archive.finalize();
