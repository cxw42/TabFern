// shortcuts/keybindings/defaults.js

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.shortcuts_keybindings_default = factory();
    }
}(this, function () {

    return {
        COPY: {
            keys: ['ctrl c'],
            repeating: true
        },
        ESC: {
            keys: ['esc']
        },
        BYPASS_CONTEXT_MENU_MOMENTARY_LATCH: {
            keys: [( JSON.parse(localStorage.getItem('store.settings.KeyMappings.KeyBinds.IgnoreContextMenu.KeyBind')) || 'shift')]
        },
        TEST_MULTIPLE: {
            keys: [
                'shift c',
                'alt shift c'
            ]
        }
    };
}));
// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
