// manifest.js: Settings for TabFern
// TODO move the names into constants in common.js
this.manifest = {
    "name": "TabFern Settings",
    "icon": "/assets/fern16.png",
    "settings": [

        // Welcome page
        {
            "tab": i18n.get("Welcome / Help"),
            "group": i18n.get("Introduction"),
            "name": "welcome-intro",
            "type": "description",
            "text": "Welcome to TabFern!  Each Chrome window you have open "+
                    "or saved is represented in the TabFern window.  "+
                    "Right-click on those representations or hover " +
                    "the mouse over them for options.  Click the " +
                    '<i class="fa fa-bars"></i> menu for more options.'
        },

        // Behaviour.  Yeah, there's a "u" in there!
        {
            "tab": i18n.get("Behaviour"),
            "group": i18n.get("When I..."),
            "name": "collapse-trees-on-startup",
            "type": "checkbox",
            "label": i18n.get("Start up, collapse all the saved trees")
            //"text": i18n.get("x-characters")
        },

        {
            "tab": i18n.get("Behaviour"),
            "group": i18n.get("When I..."),
            "name": "collapse-tree-on-window-close",
            "type": "checkbox",
            "label": i18n.get("Close a window, collapse its tree")
            //"text": i18n.get("x-characters")
        },

        // Features
        {
            "tab": "Features",
            "group": "Context Menu",
            "name": "ContextMenu.Enabled",
            "type": "checkbox",
            "label": "Enable right-click menus (refresh the TabFern window after you change this to make the change take effect)"
        },
        {
            "tab": "Features",
            "group": "Key Mapping",
            "name": "KeyBinds.Enabled",
            "type": "checkbox",
            "label": "Enable key mapping (refresh the TabFern window after you change this to make the change take effect)"
        },

        {
            "tab": "Key Mappings",
            "group": "Persistence Control",
            "name": "KeyMappings.PersistenceControl.SaveButton",
            "type": "button",
            "text": "Save"
        },
        {
            "tab": "Key Mappings",
            "group": "Persistence Control",
            "name": "KeyMappings.PersistenceControl.RevertButton",
            "type": "button",
            "text": "Revert"
        },

        // Key Mappings.
        // TODO Generate these from code.
        {
            "tab": "Key Mappings",
            "group": "Key Bindings",
            "name": "KeyMappings.KeyBinds.IgnoreContextMenu.KeyBind",
            "type": "text",
            "text": "IgnoreContextMenu"
        },
        {
            "tab": "Key Mappings",
            "group": "Key Bindings",
            "name": "KeyMappings.KeyBinds.IgnoreContextMenu.ClearButton",
            "type": "button",
            "text": "Clear"
        },
        {
            "tab": "Key Mappings",
            "group": "Key Bindings",
            "name": "KeyMappings.KeyBinds.IgnoreContextMenu.EnterBindModeButton",
            "type": "button",
            "text": "Bind"
        },
        {
            "tab": "Key Mappings",
            "group": "Key Bindings",
            "name": "KeyMappings.KeyBinds.IgnoreContextMenu.AdditionalBindButton",
            "type": "button",
            "text": "X or + or don't show when these are dynamic"
        },

        // Changelog
        {
            "tab": i18n.get("Feature history"),
            "group": "Version 0.1.5",
            "name": "changelog-0_1_5",
            "type": "description",
            "text": "Bug fixes, including workarounds for Chrome 61 changes"
        },
        {
            "tab": i18n.get("Feature history"),
            "group": "Version 0.1.4",
            "name": "changelog-0_1_4",
            "type": "description",
            "text": "Added context menus, saving of TabFern window position, "+
                    "and Expand All/Collapse All."
        },
        {
            "tab": i18n.get("Feature history"),
            "group": "Version 0.1.2",
            "name": "changelog-0_1_2",
            "type": "description",
            "text": "First version released to the Chrome Web Store"
        }
    ]
};
// vi: set ts=4 sts=4 sw=4 et ai: //
