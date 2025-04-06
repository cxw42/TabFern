// brunch-config.js for brunch-test by cxw42
let child_process = require("child_process"),
    replaceStream = require("replacestream"),
    fs = require("fs"),
    path = require("path");

let pkg_json = require("./package.json");
let messages_en = require("./static/_locales/en/messages.json");

/*
 * Notes on the TabFern extension friendly version number.
 *
 * The friendly version is the version in package.json and the
 * version_name in public/manifest.json.  Since it
 * is displayed in the title bar of the popup window, it is lowercase (no
 * shouting!).  The following should match:
 *
 *  - package.json (the version_name)   <--- single source of truth
 *  - package-lock.json (the version_name)
 *  - public/manifest.json (both the version and version_name)
 *
 * Design decision: version numbers are defied in package.jsin and
 * follow semver.org.
 * In the Chrome manifest, the version_name attribute tracks the above.
 * The version attribute, `x.y.z.w`, which is compared in numeric order L-R,
 * is as follows: x.y.z track the above.  w is the "-pre." or "-rc." number.
 * A release to the Chrome Web Store has w=1337.
 * E.g., 1.2.3-pre.4 is `version='1.2.3.4'`, and 1.2.3 (release) is
 * `version='1.2.3.1337'`.
 * If you get up to -pre.1336, just bump the `z` value and reset `w` :) .
 *
 * If you specify all four digits in package.json, they will be copied across
 * verbatim into Chrome's version, but the version_name will only be `x.y.z`.
 * This is to support patch releases that don't trigger a new-version
 * notification (e.g., x.y.z.1338).
 */

// =======================================================================
// Copy the manifest file and populate version numbers from package.json.
// TODO make this a Brunch plugin instead.
try {
    fs.mkdirSync("public");
} catch (err) {}
try {
    fs.mkdirSync("public/assets");
} catch (err) {}

// Parse the version from package.json
let ver_re = /^(\d+)\.(\d+)\.(\d+)(-[a-z]+)?(?:\.(\d+))?$/;
// Permit x.y.z and x.y.z-pre.w (normal use)
// Also permit x.y.z.w (for specifying w>1337)
let matches = ver_re.exec(pkg_json.version);
if (matches == null) {
    console.error("Invalid version in package.json");
    process.exit(); // ABORT
}

// Make the Chrome-format version
if (matches[5] == null) {
    // Non-prerelease has w=1337 by default
    matches[5] = 1337;
}
const IS_DEV = matches[5] < 1337;
const VER_TUPLE = matches.slice(1, 4).join(".") + `.${matches[5]}`; // x.y.z.w

// Check the git status
let git_status;
try {
    git_status = child_process.execSync("git s --porcelain=v2 -b -v -u");
} catch (err) {
    console.warn(`Could not get git status: ${err}`);
}

let git_hash;
let git_is_dirty;
if (git_status) {
    let hash_re = /^# branch.oid (.{7}).+$/m;
    let matches = hash_re.exec(git_status);
    if (matches && matches[1]) {
        git_hash = matches[1];
    }
    git_is_dirty = /^[^#]/m.test(git_status);
}

// Format the version number
let repo_version = "";
if (IS_DEV) {
    let dirty_msg = git_is_dirty ? "-dirty" : "";
    repo_version =
        " (" + (git_hash ? git_hash : "development") + dirty_msg + ")";
}

const VER_NAME =
    (matches[4] == null ? matches.slice(1, 4).join(".") : pkg_json.version) +
    repo_version;

console.log(`TF version ${pkg_json.version} -> ${VER_TUPLE} ("${VER_NAME}")`);

// Copy app/manifest.json->public/manifest.json and fill in versions
fs.createReadStream(path.join(__dirname, "var", "manifest.json"))
    .pipe(replaceStream("$VER$", VER_TUPLE))
    .pipe(replaceStream("$VERNAME$", VER_NAME))
    .pipe(
        fs.createWriteStream(path.join(__dirname, "public", "manifest.json"))
    );

// Copy icons from var/ to public/assets/ depending on whether or not it's
// a dev version.
if (!IS_DEV) {
    fs.copyFileSync("./var/green16.png", "./public/assets/favicon.png");
    fs.copyFileSync("./var/green48.png", "./public/assets/fern48.png");
    fs.copyFileSync("./var/green128.png", "./public/assets/fern128.png");
} else {
    fs.copyFileSync("./var/orange16.png", "./public/assets/favicon.png");
    fs.copyFileSync("./var/orange48.png", "./public/assets/fern48.png");
    fs.copyFileSync("./var/orange128.png", "./public/assets/fern128.png");
}

// =======================================================================
// Make the backup 18n config
messages_en_trimmed = {};
for (let msg in messages_en) {
    messages_en_trimmed[msg] = messages_en[msg].message;
}

// =======================================================================
// Actual Brunch config

/// The object we will eventually return
let me = {
    paths: {
        // Bundle from these:
        watched: ["app", "lib", "static", "vendor"],
        // All of these will be wrapped, except for those matching
        // conventions.vendor or conventions.assets below.
        // For example, lib/* will be wrapped.
    },

    files: {
        javascripts: {
            entryPoints: {
                "app/win/container.js": "win/container.js",
                // popup window
                "app/win/main_deps.js": "win/main.js",
                // main window, in an iframe in the popup
                "app/bg/background.js": "bg/background.js",
                // background script (has no page)
                "app/settings/settings.js": "settings/settings-main.js",
                // settings window
                "app/mv3-converter/mv3-converter.js":
                    "mv3-converter/mv3-converter.js",
                // offscreen document to convert mv2->mv3 material
            },

            order: {
                // Note: if multiple matchers are listed in the `before` or
                // `after` arrays, files will be given in that relative order.
                // Thanks to https://stackoverflow.com/a/26819008/2877364 by
                // https://stackoverflow.com/users/2297279/es128 for the tip.
                before: [/validation/],
                // conventions.vendor below specifies that *_tl* are
                // top-level modules.  This line causes files in the
                // vendor/ directory to go before other vendor files,
                // e.g., *_tl* files.  All the vendor files go after
                // the wrapped modules.
                after: [/_tl\b/],
            },

            // _tl files go after the wrapped modules instead of before
            postWrapped: [/_tl\b/],
        },

        stylesheets: {
            // Note: can't use entryPoints -
            // https://github.com/brunch/brunch/issues/1640
            joinTo: {
                "win/main-pre.css": /^app\/win/,
                "settings/settings-main.css": /^app\/settings/,
            },
        },
    },

    modules: {
        autoRequire: {
            // When JS files are loaded, run them
            // Output file:     [ deps to autoload ]
            "bg/background.js": ["bg/background"],
            "win/container.js": ["win/container"],
            "settings/settings-main.js": ["settings/settings"],
            "mv3-converter/mv3-converter.js": ["mv3-converter/mv3-converter"],
        },
    },

    conventions: {
        // Don't wrap the following in modules.  Note that these files
        // are not scanned for dependencies, except for node_modules.
        vendor: [/(^node_modules|vendor)\//, /_tl\b/],
        // `node_modules` must be listed, but is handled specially by
        // brunch so that CommonJS modules can be used in the browser.
        //
        // _tl is so that individual source files, e.g., in app/,
        // can be flagged as top-level (unwrapped).

        // Also pull assets from static/ .  Thanks to
        // https://stackoverflow.com/a/39141542/2877364 by
        // https://stackoverflow.com/users/2986873/jwanglof
        assets: (path) => {
            if (/\/$/.test(path)) return path;
            return /^static\//.test(path);
        },

        ignored: [
            /\/__/,
            // Don't ignore _*, or else Brunch won't copy _locales.
            // Instead, use __ for partials.  Thanks to
            // https://stackoverflow.com/a/43426151/2877364 by
            // https://stackoverflow.com/users/4028896/johannes-filter

            /vendor\/(node|j?ruby-.+|bundle)\//,
            // The rest of the default ignore from
            // https://github.com/brunch/brunch/blob/ab89a016121fc7ba4ebfbe8bdc93a22bcd8d4cda/lib/utils/config-validate.js#L73

            /node_modules\/process\/browser.js/,
            // https://github.com/brunch/brunch/issues/1503#issuecomment-320902509
        ],
    },

    npm: {
        compilers: ["babel-brunch"], // run babel-brunch on node_modules/...
        aliases: { path: "path-browserify" },
    },

    plugins: {
        assetsmanager: {
            // Copy files on build.  This is for files that
            copyTo: {
                // don't need to be watched.
                // font-awesome
                "assets/font-awesome/css": [
                    "node_modules/font-awesome/css/font-awesome.css",
                ],
                // Fonts: we only need one format, so I picked the smallest.
                "assets/font-awesome/fonts": [
                    "node_modules/font-awesome/fonts/*.woff2",
                ],

                // spectrum-colorpicker
                "assets/css": [
                    "node_modules/spectrum-colorpicker/spectrum.css",
                ],
            },
        },

        babel: {
            ignore: [
                "app/**",
                "lib/**",
                /^node_modules\/(?!spin\.js)/,
                "t/**",
                "vendor/**",
            ],
            // At the moment, only spin.js needs Babel treatment.
            // Ignore everything else to save time and reduce the
            // chance of surprise.  An example of surprise:
            // https://stackoverflow.com/q/34973442/2877364
        },

        sass: {
            options: {
                includePaths: ["node_modules"],
            },
        },
    },

    sourceMaps: "inline", // Chrome doesn't load external ones

    overrides: {
        production: {
            // Always generate source maps, even in production
            sourceMaps: true,
        },
    },
};

// String replacement

// Regexes we will replace in our source files
const kFN = /\b__filename\b/;

me.plugins.replacer = {
    // Permit using __filename in modules
    dict: [
        { key: kFN },
        { key: /\bTABFERN_GIT_HASH\b/, value: `'${git_hash}'` },
        { key: /\bTABFERN_VERSION\b/, value: `'${VER_NAME}'` },
        {
            key: "0;///I18N_MESSAGES///",
            value: JSON.stringify(messages_en_trimmed),
        },
    ],

    replace: (str, key, value, path) => {
        if (key === kFN) {
            value = `'${path}'`;
        }
        return str.split(key).join(value);
    },
};

// Run tests in development only.
me.overrides.development = {
    paths: {
        watched: me.paths.watched.concat(["t"]),
    },

    files: {
        javascripts: {
            entryPoints: {
                ...me.files.javascripts.entryPoints,
                "t/test-main.js": "t/test-main.js",
            },
            order: {
                // Have to copy it, or else it gets blown away.
                before: me.files.javascripts.order.before || [],

                // Jasmine files after validation, common.
                after: me.files.javascripts.order.after.concat([
                    /jasmine.+jasmine[^-]/,
                    /jasmine-html/,
                    /jasmine.+boot\b/,
                ]),
            },
        },
    },

    modules: {
        autoRequire: {
            ...me.modules.autoRequire,
            "t/test-main.js": ["t/test-main"],
        },
    },

    conventions: {
        vendor: me.conventions.vendor.concat(["t/lib/jasmine*/*"]),
    },
};

//// Production.  TODO figure out how to get the filenames to match between
//// CSS and HTML.  Maybe copycat-brunch will be able to do this.
//me.overrides.production = {
//    plugins: {
//        assetsmanager: {
//            copyTo: {
//                // Use the minified font-awesome CSS
//                'assets/font-awesome/css/':
//                    [ 'node_modules/font-awesome/css/font-awesome.min.css',
//                      'node_modules/font-awesome/css/font-awesome.css.map' ],
//
//                'assets/font-awesome/fonts':
//                    ['node_modules/font-awesome/fonts/*.woff2'],
//            },
//        },
//    },
//};

// Firefox build
me.overrides.firefox = {
    hooks: {
        onCompile: () => {
            console.log("Making public-ff tree");
            try {
                child_process.execSync("node tools/ffize.js");
                console.log("done");
            } catch (error) {
                console.error(error);
            }
        },
    },
};

//console.dir(me, {depth:null});    // DEBUG
module.exports = me;

// vi: set ts=4 sts=4 sw=4 et ai: //
