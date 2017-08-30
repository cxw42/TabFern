// manifest.js: Settings for TabFern
// TODO move the names into constants in common.js
this.manifest = {
    "name": "TabFern Settings",
    "icon": "/assets/fern16.png",
    "settings": [

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

        // Details
        {
            "tab": "Details",
            "group": "ContextMenu",
            "name": "ContextMenu.Enabled",
            "type": "checkbox",
            "label": "Right-click Menu (refresh the TabFern window after you change this to make the change take effect)"
        },
        {
            "tab": "Details",
            "group": "KeyBinds",
            "name": "KeyBinds.Enabled",
            "type": "checkbox",
            "label": "KeyBinding Functionality"
        },

        {
            "tab": "Key Mappings",
            "group": "KeyMappings.PersistenceControl",
            "name": "KeyMappings.PersistenceControl.SaveButton",
            "type": "button",
            "text": "Save"
        },
        {
            "tab": "Key Mappings",
            "group": "KeyMappings.PersistenceControl",
            "name": "KeyMappings.PersistenceControl.RevertButton",
            "type": "button",
            "text": "Revert"
        },

        // Key Mappings.
        // TODO Generate these from code.
        {
            "tab": "Key Mappings",
            "group": "KeyMappings.KeyBinds",
            "name": "KeyMappings.KeyBinds.IgnoreContextMenu.KeyBind",
            "type": "text",
            "text": "IgnoreContextMenu"
        },
        {
            "tab": "Key Mappings",
            "group": "KeyMappings.KeyBinds",
            "name": "KeyMappings.KeyBinds.IgnoreContextMenu.ClearButton",
            "type": "button",
            "text": "Clear"
        },
        {
            "tab": "Key Mappings",
            "group": "KeyMappings.KeyBinds",
            "name": "KeyMappings.KeyBinds.IgnoreContextMenu.EnterBindModeButton",
            "type": "button",
            "text": "Bind"
        },
        {
            "tab": "Key Mappings",
            "group": "KeyMappings.KeyBinds",
            "name": "KeyMappings.KeyBinds.IgnoreContextMenu.AdditionalBindButton",
            "type": "button",
            "text": "X or + or don't show when these are dynamic"
        }

    ]
};
// vi: set ts=4 sts=4 sw=4 et ai: //
