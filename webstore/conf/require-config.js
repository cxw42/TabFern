// require-config.js: Configuration for RequireJS in TabFern.
// Loaded before require itself.

var require = {
    baseUrl: '/js',
    paths: {        // modules that haven't graduated to /js yet.
        // Specific modules that live different places
        'bypasser': '/src/view/bypasser',
        'shortcuts': '/src/view/shortcuts/shortcuts',
        'dmauro_keypress': '/src/view/shortcuts/drivers/dmauro_keypress',
        'shortcuts_keybindings_default': '/src/view/shortcuts/keybindings/defaults',

        // Aliases for parts of the application (relative to baseUrl)
        'local': '../src',
        'view': '../src/view',
        'common': '../src/common',
    },
    bundles: {
        // NOTE: keep these lists in sync with the lists in the Makefile
        'view/bundle_common': [
            'jquery',
            'loglevel',
        ],
        'view/bundle_tree': [
            'jstree',
            'jstree-actions',
            'jstree-flagnode',
            'jstree-because',
            'jstree-multitype',
            'jstree-redraw-event',
            'multidex',
            'justhtmlescape',
            'signals',
            'asynquence',
            'asynquence-contrib',
            'asq-helpers',
            'rmodal',
            'tinycolor',
            'keypress',
            'hamburger',
            'import-file',
            'export-file',
        ]
    },
    shim: { // Note: can't bundle non-AMD shimmed modules --- requirejs#1172
        buffer: {
            exports: 'Buffer'
        },
        blake2s: {
            exports: 'BLAKE2s'
        }
    },
};

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
