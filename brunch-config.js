// brunch-config.js for brunch-test by cxw42

module.exports = {
    paths: {
        // Bundle from these:
        watched: ['app', 'lib', 'vendor'],
            // All of these will be wrapped, except for those matching
            // conventions.vendor below.  For example, lib/* will be wrapped.
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
            },

            order: {
                before: /^vendor\//,
                    // conventions.vendor below specifies that *_tl* are
                    // top-level modules.  This line causes files in the
                    // vendor/ directory to go before other vendor files,
                    // e.g., *_tl* files.  All the vendor files go after
                    // the wrapped modules.
            },
        },

        stylesheets: {
            joinTo: 'assets/bulk.css',
                // i.e., output to public/assets/bulk.css.
                // Note: can't use entryPoints -
                // https://github.com/brunch/brunch/issues/1640
        },
    },

    conventions: {
        // Don't wrap the following in modules.  Note that these files
        // are not scanned for dependencies, except for node_modules.
        vendor: [ /((^node_modules|vendor)\/)|(_tl)/ ],
            // `node_modules` must be listed, but is handled specially by
            // brunch so that CommonJS modules can be used in the browser.
            //
            // _tl is so that individual source files, e.g., in app/,
            // can be flagged as top-level (unwrapped).
    },

    npm: {
        globals: { '$': 'jquery' },
        compilers: ['babel-brunch'],    // run babel-brunch on node_modules/...
        aliases: { path: 'path-browserify' },

        styles: {   // map module name to path of the CSS in the module's dir
            'spin.js': ['spin.css'],
            'rmodal': ['dist/rmodal-no-bootstrap.css'],
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

        assetsmanager: {    // Copy files on build
            copyTo: {
                '.': ['static/*'],    // . => public
                'assets/fontawesome': ['node_modules/font-awesome/css',
                                        'node_modules/font-awesome/fonts'],
            },
        },

        babel: {
            ignore: [ 'app/**', 'lib/**', /^node_modules\/(?!spin\.js)/ ],
                // At the moment, only spin.js needs Babel treatment.
                // Ignore everything else to save time and reduce the
                // chance of surprise.
        },
    },

    overrides: {
        production: {       // Always generate source maps, even in production
            sourceMaps: true,
        },
    },
};

// vi: set ts=4 sts=4 sw=4 et ai: //
