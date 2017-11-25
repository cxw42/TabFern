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
    async: {
        useHash: true   // #callback=x rather than ?callback=x since Chrome
                        // won't load files with ?
    },
};

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
