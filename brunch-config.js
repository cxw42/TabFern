// brunch-config.js for brunch-test by cxw42

/*
 * Notes on the TabFern extension friendly version number.
 *
 * The friendly version is the version_name in static/manifest.json.  Since it
 * is displayed in the title bar of the popup window, it is lowercase (no
 * shouting!).  The following should match:
 *
 *  - static/manifest.json (both the version and version_name)
 *  - package.json (the version_name)
 *  - package-lock.json (the version_name)
 *
 * Design decision: version numbers follow semver.org.
 * In the Chrome manifest, the version_name attribute tracks the above.
 * The version attribute, `x.y.z.w`, which is compared in numeric order L-R,
 * is as follows: x.y.z track the above.  w is the "-pre." or "-rc." number.
 * A release to the Chrome Web Store has w=1337.
 * E.g., 1.2.3-pre.4 is `version='1.2.3.4'`, and 1.2.3 (release) is
 * `version='1.2.3.1337'`.
 * If you get up to -pre.1336, just bump the `z` value and reset `w` :) .
 */

/// The object we will eventually return
let me = {
    paths: {
        // Bundle from these:
        watched: ['app', 'lib', 'static', 'vendor'],
            // All of these will be wrapped, except for those matching
            // conventions.vendor or conventions.assets below.
            // For example, lib/* will be wrapped.
    },

    files: {
        javascripts: {
            entryPoints: {
                'app/win/container.js': 'win/container.js',
                    // popup window
                'app/win/main_deps.js': 'win/main.js',
                    // main window, in an iframe in the popup
                'app/bg/background.js': 'bg/background.js',
                    // background script (has no page)
                'app/settings/settings.js': 'settings/settings-main.js',
                    // settings window
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
                'win/main-pre.css': /^app\/win/,
                'settings/settings-main.css': /^app\/settings/,
            },
        },
    },

    modules: {
        autoRequire: {
            // Output file:     [ deps to autoload ]
            'bg/background.js': ['bg/background'],
            'win/container.js': ['win/container'],
            'settings/settings-main.js': ['settings/settings'],
        },
    },

    conventions: {

        // Don't wrap the following in modules.  Note that these files
        // are not scanned for dependencies, except for node_modules.
        vendor: [ /(^node_modules|vendor)\//, /_tl\b/ ],
            // `node_modules` must be listed, but is handled specially by
            // brunch so that CommonJS modules can be used in the browser.
            //
            // _tl is so that individual source files, e.g., in app/,
            // can be flagged as top-level (unwrapped).

        // Also pull assets from static/ .  Thanks to
        // https://stackoverflow.com/a/39141542/2877364 by
        // https://stackoverflow.com/users/2986873/jwanglof
        assets: (path)=>{
            if( /\/$/.test(path) ) return path;
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

            /node_modules\/process\/browser.js/
                // https://github.com/brunch/brunch/issues/1503#issuecomment-320902509
        ]
    },

    npm: {
        compilers: ['babel-brunch'],    // run babel-brunch on node_modules/...
        aliases: { path: 'path-browserify' },
    },

    plugins: {

        assetsmanager: {    // Copy files on build.  This is for files that
            copyTo: {       // don't need to be watched.
                // font-awesome
                'assets/font-awesome/css':
                    ['node_modules/font-awesome/css/font-awesome.css'],
                // Fonts: we only need one format, so I picked the smallest.
                'assets/font-awesome/fonts':
                    ['node_modules/font-awesome/fonts/*.woff2'],

                // spectrum-colorpicker
                'assets/css':
                    ['node_modules/spectrum-colorpicker/spectrum.css'],
            },
        },

        babel: {
            ignore: [ 'app/**', 'lib/**', /^node_modules\/(?!spin\.js)/,
                        'test/**', 'vendor/**' ],
                // At the moment, only spin.js needs Babel treatment.
                // Ignore everything else to save time and reduce the
                // chance of surprise.  An example of surprise:
                // https://stackoverflow.com/q/34973442/2877364
        },

        sass: {
            options: {
                includePaths: ['node_modules'],
            },
        },
    },

    overrides: {
        production: {       // Always generate source maps, even in production
            sourceMaps: true,
        },
    },
};

// String replacement
let chrome_manifest = require('./static/manifest.json');

// Regexes we will replace
const kFN = /\b__filename\b/;

me.plugins.replacer = {     // Permit using __filename in modules
    dict: [
        { key: kFN, },
        { key: /\bTABFERN_VERSION\b/,
            value: `'${chrome_manifest.version_name}'` },
    ],

    replace: (str, key, value, path) => {
        if(key === kFN) {
            value = `'${path}'`;
        }
        return str.split(key).join(value);
    }
};

// Run tests in development only.
me.overrides.development = {
    paths: {
        watched: me.paths.watched.concat(['test']),
    },

    files: {
        javascripts: {
            entryPoints: {
                ...me.files.javascripts.entryPoints,
                'test/test-main.js': 'test/test-main.js',
            },
            order: {
                // Have to copy it, or else it gets blown away.
                before: me.files.javascripts.order.before || [],

                // Jasmine files after validation, common.
                after: me.files.javascripts.order.after.concat(
                    [/jasmine.+jasmine[^-]/, /jasmine-html/,
                        /jasmine.+boot\b/]),
            },
        },
    },

    modules: {
        autoRequire: {
            ...me.modules.autoRequire,
            'test/test-main.js': ['test/test-main'],
        },
    },

    conventions: {
        vendor: me.conventions.vendor.concat(['test/lib/jasmine*/*']),
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

//console.dir(me, {depth:null});    // DEBUG
module.exports = me;

// vi: set ts=4 sts=4 sw=4 et ai: //
