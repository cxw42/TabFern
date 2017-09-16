// require-config.js: Configuration for RequireJS in TabFern.
// Loaded before require itself.

var require = {
    baseUrl: '/js'
    ,paths: {    // modules that haven't graduated to /js yet.
        'local': '../src'
      , 'bypasser': '/src/view/bypasser'
      , 'shortcuts': '/src/view/shortcuts/shortcuts'
      , 'dmauro_keypress': '/src/view/shortcuts/drivers/dmauro_keypress'
      , 'shortcuts_keybindings_default': '/src/view/shortcuts/keybindings/defaults'
    }
//  ,  map: {
//        '*': {
//            'keypress': 'dmauro-Keypress-2.1.3-9-80c0f97/keypress'
//            }
//    }
};

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
