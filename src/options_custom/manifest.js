// SAMPLE
this.manifest = {
    "name": "My Extension",
    "icon": "icon.png",
    "settings": [
        {
            "tab": i18n.get("information"),
            "group": i18n.get("login"),
            "name": "username",
            "type": "text",
            "label": i18n.get("username"),
            "text": i18n.get("x-characters")
        },
        {
            "tab": i18n.get("information"),
            "group": i18n.get("login"),
            "name": "password",
            "type": "text",
            "label": i18n.get("password"),
            "text": i18n.get("x-characters-pw"),
            "masked": true
        },
        {
            "tab": i18n.get("information"),
            "group": i18n.get("login"),
            "name": "myDescription",
            "type": "description",
            "text": i18n.get("description")
        },
        {
            "tab": i18n.get("information"),
            "group": i18n.get("logout"),
            "name": "myCheckbox",
            "type": "checkbox",
            "label": i18n.get("enable")
        },
        {
            "tab": i18n.get("information"),
            "group": i18n.get("logout"),
            "name": "myButton",
            "type": "button",
            "label": i18n.get("disconnect"),
            "text": i18n.get("logout")
        },
        {
            "tab": "Details",
            "group": "Sound",
            "name": "noti_volume",
            "type": "slider",
            "label": "Notification volume:",
            "max": 1,
            "min": 0,
            "step": 0.01,
            "display": true,
            "displayModifier": function (value) {
                return (value * 100).floor() + "%";
            }
        },
        {
            "tab": "Details",
            "group": "Sound",
            "name": "sound_volume",
            "type": "slider",
            "label": "Sound volume:",
            "max": 100,
            "min": 0,
            "step": 1,
            "display": true,
            "displayModifier": function (value) {
                return value + "%";
            }
        },
        {
            "tab": "Details",
            "group": "Food",
            "name": "myPopupButton",
            "type": "popupButton",
            "label": "Soup 1 should be:",
            "options": {
                "groups": [
                    "Hot", "Cold",
                ],
                "values": [
                    {
                        "value": "hot",
                        "text": "Very hot",
                        "group": "Hot",
                    },
                    {
                        "value": "Medium",
                        "group": 1,
                    },
                    {
                        "value": "Cold",
                        "group": 2,
                    },
                    ["Non-existing"]
                ],
            },
        },
        {
            "tab": "Details",
            "group": "Food",
            "name": "myListBox",
            "type": "listBox",
            "label": "Soup 2 should be:",
            "options": [
                ["hot", "Hot and yummy"],
                ["cold"]
            ]
        },
        {
            "tab": "Details",
            "group": "Food",
            "name": "myRadioButtons",
            "type": "radioButtons",
            "label": "Soup 3 should be:",
            "options": [
                ["hot", "Hot and yummy"],
                ["cold"]
            ]
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

        // TODO Generate these from code
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

    ],
    "alignment": [
        [
            "username",
            "password"
        ],
        [
            "noti_volume",
            "sound_volume"
        ]
    ]
};
