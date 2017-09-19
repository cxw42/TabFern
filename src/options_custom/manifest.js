// manifest.js: Settings for TabFern
// TODO move the names into constants in common.js
// Note: the tabs and groups are created in the order they
// first appear in the manifest.
(function(root){
    // Shortcuts for frequently-used items
    let ham = '<i class="fa fa-bars"></i>';
    let gt = '<i class="fa fa-lg fa-caret-right"></i>';

    // Assign the settings
    root.manifest = {
        "name": "Settings - ver. "+TABFERN_VERSION+' - TabFern',
        "icon": "/assets/fern16.png",
        "settings": [

            // Welcome page
            {
                "tab": i18n.get("Welcome / Help"),
                "group": i18n.get("Introduction"),
                "name": "welcome-intro",
                "type": "description",
                "text": "<p>Welcome to TabFern!  Each Chrome window you have open "+
                        "or saved is represented in the TabFern window.  "+
                        "Right-click on those representations or hover " +
                        "the mouse over them for options.  Click the " +
                        ham + ' menu for more options.</p>' +
                        '<p>The tabs at the left have settings and, at the bottom'+
                        ' of the list, information about recent feature additions'+
                        ' or changes.</p>'
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
            {
                "tab": i18n.get("Behaviour"),
                "group": i18n.get("When I..."),
                "name": CFG_RESTORE_ON_LAST_DELETED,
                "type": "checkbox",
                "label": i18n.get("Restore the last-deleted window, reopen its tabs")
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
                "tab": i18n.get("What's new?"),
                "group": "Version 0.1.8",
                "name": "changelog-0_1_8",
                "type": "description",
                "text":
    '<ul>' +
    '<li>You can right-click a tab to give it a top border.  This lets you ' +
        'visually separate tabs in the tree at any point.</li>'+
    '</ul>'
            },
            {
                "tab": i18n.get("What's new?"),
                "group": "Version 0.1.7",
                "name": "changelog-0_1_7",
                "type": "description",
                "text":
    '<ul>' +
    '<li>Numeric sort order options (on the '+ham+' '+gt+' Sort menu)</li>'+
    '<li>"Restore last deleted" option on the '+ham+' menu</li>'+
    '<li>To close the '+ham+' menu without the keyboard, move the mouse off of it for a second or two</li>'+
    '<li>Improvements under the hood for robustness</li>'+
    '</ul>'
            },
            {
                "tab": i18n.get("What's new?"),
                "group": "Version 0.1.6",
                "name": "changelog-0_1_6",
                "type": "description",
                "text":
    '<ul>' +
    '<li>Sorting list by window name (on the '+ham+' '+gt+' Sort menu)</li>'+
    '<li>You can now drag and drop windows to rearrange them in the tree!</li>'+
    '</ul>'
            },
            {
                "tab": i18n.get("What's new?"),
                "group": "Version 0.1.5",
                "name": "changelog-0_1_5",
                "type": "description",
                "text": "You can now right-click on a saved window and choose "+
                    '"Forget" to leave the window as open, but not save it '+
                    'for next time.  Also includes some bug fixes, including '+
                    'workarounds for Chrome 61 changes.'
            },
            {
                "tab": i18n.get("What's new?"),
                "group": "Version 0.1.4",
                "name": "changelog-0_1_4",
                "type": "description",
                "text": "Added context menus, saving of TabFern window position, "+
                        "and Expand All/Collapse All."
            },
            {
                "tab": i18n.get("What's new?"),
                "group": "Version 0.1.2",
                "name": "changelog-0_1_2",
                "type": "description",
                "text": "First version released to the Chrome Web Store"
            }
        ]
    };
})(this);
// vi: set ts=4 sts=4 sw=4 et ai: //
