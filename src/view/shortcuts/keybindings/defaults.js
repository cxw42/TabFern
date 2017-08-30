window._tabFernShortcuts = window._tabFernShortcuts || {};

window._tabFernShortcuts.keybindings = window._tabFernShortcuts.keybindings || {};


window._tabFernShortcuts.keybindings.default = {
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
