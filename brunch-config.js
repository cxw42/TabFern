// brunch-config.js for brunch-test by cxw42

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
            joinTo: 'assets/bulk.css',
                // i.e., output to public/assets/bulk.css.
                // Note: can't use entryPoints -
                // https://github.com/brunch/brunch/issues/1640
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

        // Don't ignore _*, or else Brunch won't copy _locales.  Thanks to
        // https://stackoverflow.com/a/43426151/2877364 by
        // https://stackoverflow.com/users/4028896/johannes-filter
        // Answer modified to use the rest of the default ignore from
        // https://github.com/brunch/brunch/blob/ab89a016121fc7ba4ebfbe8bdc93a22bcd8d4cda/lib/utils/config-validate.js#L73
        ignored: (path) => /vendor\/(node|j?ruby-.+|bundle)\//.test(path),
    },

    npm: {
        compilers: ['babel-brunch'],    // run babel-brunch on node_modules/...
        aliases: { path: 'path-browserify' },

        styles: {   // map module name to path of the CSS in the module's dir
            'spin.js': ['spin.css'],
            'rmodal': ['dist/rmodal-no-bootstrap.css'],
            // Can't list font-awesome here because it doesn't have a
            // JS module to require().
        },
    },

    plugins: {
        replacer: {     // Permit using __filename in modules
            dict: [
                { key: /\b__filename\b/, }
            ],
            replace: (str, key, value, path) => {
                return str.split(key).join(`'${path}'`)
            }
        },

        assetsmanager: {    // Copy files on build.  This is for files that
            copyTo: {       // don't need to be watched.
                'assets/fontawesome': ['node_modules/font-awesome/css',
                                        'node_modules/font-awesome/fonts'],
            },
        },

        babel: {
            ignore: [ 'app/**', 'lib/**', /^node_modules\/(?!spin\.js)/,
                        'test/**' ],
                // At the moment, only spin.js needs Babel treatment.
                // Ignore everything else to save time and reduce the
                // chance of surprise.
                // Example of surprise:
                // https://stackoverflow.com/q/34973442/2877364
        },
    },

    overrides: {
        production: {       // Always generate source maps, even in production
            sourceMaps: true,
        },
    },
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

console.dir(me, {depth:null});
module.exports = me;

// vi: set ts=4 sts=4 sw=4 et ai: //
