/// settings-page.js: Create a settings page
/// Copyright (c) 2018, 2025 Chris White.  Ported from Mootools
/// https://github.com/frankkohlhepp/store-js
/// and https://github.com/frankkohlhepp/fancy-settings
/// Copyright (c) 2011 Frank Kohlhepp.
/// SPDX-License-Identifier: MIT

if (false) {
    // bundle these
    require("vendor/common");
}

let $ = require("jquery");

// Utilities /////////////////////////////////////////////////////////////

// Unique ID

let UID = Date.now();

function getUniqueId() {
    return "id" + (UID++).toString(36);
}

// Storage ///////////////////////////////////////////////////////////////
// TODO!

// Singleton implemented using MDN's
// <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties#simulating_private_constructors>
class Store {
    static #instance = null;
    static #constructing = false;

    // --- Singleton support ---

    constructor() {
        if (!Store.#constructing) {
            throw new Error(
                "Use `Store.getInstance()` instead of `new Store()`"
            );
        }
        Store.#constructing = false;
    } // ctor

    // Get the singleton instance
    static getInstance(name) {
        if (!Store.#instance) {
            Store.#constructing = true;
            Store.#instance = new Store();
        }
        return Store.#instance;
    } // getInstance()

    // --- Instance methods ---

    // Get the name in localStorage for setting `name`.
    static #itemName(name) {
        // Static so brunch can handle it
        return `store.settings.${name}`;
    }

    get(name) {
        const itemName = this.#itemName(name);
        const value = localStorage.getItem(itemName);
        if (value === null) {
            return undefined;
        }
        try {
            return JSON.parse(value);
        } catch (e) {
            return null;
        }
    } // get()

    set(name, value) {
        const itemName = this.#itemName(name);
        if (value === undefined) {
            this.remove(itemName);
        } else {
            if (typeof value === "function") {
                value = null;
            } else {
                try {
                    value = JSON.stringify(value);
                } catch (e) {
                    value = null;
                }
            }

            localStorage.setItem(itemName, value);
        }
    }

    remove(name) {
        const itemName = this.#itemName(name);
        localStorage.removeItem(itemName);
    };
}

let STORE = Store.getInstance();

// Individual settings ///////////////////////////////////////////////////

// Base class for an individual setting
class Setting {
    _name; // The name of the setting in the store
    #type; // The type of the setting
    #$setting; // The top-level JQuery element of this setting
    _$contents; // for subclasses to fill in

    constructor($parent, settingData) {
        this._name = settingData.name;
        this.#type = settingData.type;

        this.#$setting = $('<div class="setting bundle"/>');
        this.#$setting.addClass(this.#type);
        this._$contents = $('<div class="setting container"/>');
        this._$contents.addClass(this.#type);

        this.#$setting.append(this._$contents);

        $parent.append(this.#$setting);
    }
} // class Setting

class Pushbutton extends Setting {
    constructor($parent, settingData, onClick) {
        super($parent, settingData);

        let $button = $('<input class="setting element button" type="button">');
        $button.attr("id", settingData.id);
        $button.attr("value", settingData.text);
        $button.on("click", onClick);

        this._$contents.append($button);
    }
} // class Pushbutton

class Checkbox extends Setting {
    constructor($parent, settingData) {
        super($parent, settingData);

        const id = getUniqueId();
        let $checkbox = $(
            '<input class="setting element checkbox" type="checkbox">'
        );
        $checkbox.attr("id", id);
        let $label = $('<label class="setting label checkbox">');
        $label.attr("for", id);
        $label.text(settingData.label);

        this._$contents.append($checkbox);
        this._$contents.append($label);
    }
} // class Checkbox

class Description extends Setting {
    constructor($parent, settingData) {
        super($parent, settingData);
        this._$contents.append(
            $('<p class="setting element description">').html(settingData.text)
        );
    }
} // class Description

class RadioButtons extends Setting {
    constructor($parent, settingData) {
        super($parent, settingData);

        if (settingData.label) {
            let $label = $('<label class="setting label radio-buttons">');
            $label.text(settingData.label);
            this._$contents.append($label);
        }

        const buttonSetID = getUniqueId();
        for (const button of settingData.options || []) {
            const buttonID = getUniqueId();

            let $div = $('<div class="setting container radio-buttons">');

            let $button = $(
                '<input class="setting element radio-buttons" type="radio">'
            );
            $button.attr("id", buttonID);
            $button.attr("name", buttonSetID);

            let $label = $(
                '<label class="setting element-label radio-buttons">'
            );
            $label.attr("for", buttonID);
            if ("html" in button) {
                $label.html(button.html);
            } else {
                $label.text(button.text);
            }

            $div.append($button);
            $div.append($label);

            // TODO button onClick

            this._$contents.append($div);
        }
    }
} // class RadioButtons

class Dropdown extends Setting {
    constructor($parent, settingData) {
        super($parent, settingData);

        if (settingData.label) {
            let $label = $('<label class="setting label popup-button">');
            $label.text(settingData.label);
            this._$contents.append($label);
        }

        let $select = $('<select class="setting element popup-button">');
        for (const option of settingData.options || []) {
            let $option = $("<option>");
            $option.text(option.text);
            $option.attr("value", option.value);
            $select.append($option);
        }

        this._$contents.append($select);
    }
} // class Dropdown

class InputBox extends Setting {
    #$entry;

    constructor($parent, settingData) {
        super($parent, settingData);

        let $label = $('<label class="setting label text">').text(
            settingData.label
        );
        this.#$entry = $('<input class="setting element text" type="text">');
        this._$contents.append($label);
        this._$contents.append(this.#$entry);
    }
} // class InputBox

// Factory function for settings
function newSetting($parent, settingData) {
    const knownSettings = {
        button: Pushbutton,
        checkbox: Checkbox,
        description: Description,
        radioButtons: RadioButtons,
        popupButton: Dropdown,
        text: InputBox,
    };

    const klass = knownSettings[settingData.type];
    return new klass($parent, settingData);
}

// Groups and tabs ///////////////////////////////////////////////////////

class Group {
    #$group;
    #$content;

    // Create a new group.  The group's name is groupName.  If groupHtml
    // is provided, use that for the group's label.
    constructor(parent, groupName) {
        // Each group gets its own table
        this.#$group = $('<table class="setting group">');
        let $tr = $("<tr>");
        let $name = $('<td class="setting group-name"></td>').text(groupName);
        this.#$content = $('<td class="setting group-content"></td>');
        $tr.append($name);
        $tr.append(this.#$content);

        this.#$group.append($tr);

        $(parent).append(this.#$group);
    }

    // Change the group's label from its name to specified HTML
    setHTML(html) {
        this.#$group.find("td.group-name").html(html);
    }

    addSetting(settingData) {
        let setting = newSetting(this.#$content, settingData);
    }
} // class Group

class Tab {
    #$tab;
    #$content;
    #groups = new Map();

    constructor(tabParent, contentParent, tab_name) {
        console.log({ Adding_tab: tab_name });
        this.#$tab = $('<div class="tab"></div>');
        this.#$tab.text(tab_name);
        tabParent.append(this.#$tab);

        this.#$content = $('<div class="tab-content"/>');
        this.#$content.append($("<h2>").text(tab_name));
        contentParent.append(this.#$content);

        this.#$tab.on("click", () => {
            this.show();
        });
    } // ctor

    show() {
        this.#$tab.siblings("div.tab").removeClass("active");
        this.#$tab.addClass("active");

        this.#$content.siblings("div.tab-content").removeClass("show");
        this.#$content.addClass("show");
    } // show()

    addOrGetGroup(groupName) {
        if (!this.#groups.has(groupName)) {
            this.#groups.set(groupName, new Group(this.#$content, groupName));
        }

        return this.#groups.get(groupName);
    } // addOrGetGroup()
} // class Tab

// Top-level class ///////////////////////////////////////////////////////

class SettingsPage {
    #$parent;
    #manifest;
    #tabs = new Map();

    constructor(parent, manifest) {
        this.#$parent = $(parent);
        this.#manifest = manifest;

        this._createSkeleton(this.#$parent);

        if (manifest.title) {
            this.#$parent[0].ownerDocument.title = manifest.title;
        }
        if (manifest.label) {
            $("#settings-label", this.#$parent).text(manifest.label);
        }
        if (manifest.icon) {
            $("#icon", this.#$parent).attr("src", manifest.icon);
        }

        for (const setting of manifest.settings || []) {
            this._addSetting(setting);
        }

        // Show the first group
        if (this.#tabs.size > 0) {
            this.#tabs.values().next().value.show();
        }
    } // ctor

    _createSkeleton($parent) {
        $parent.html(`
            <div id="sidebar" class="fancy">
                <img id="icon" src="" alt=""><h1 id="settings-label"></h1>
                <div id="tab-container">
                    <div id="search-container" class="tab">
                        <input id="search" type="search" placeholder="">
                    </div>
                </div>
            </div>
            <div id="content">
                <div id="search-result-container" class="tab-content">
                    <h2 id="search-label"></h2>
                </div>
            </div>
        `);
    }

    addOrGetTab(tabName) {
        if (!this.#tabs.has(tabName)) {
            this.#tabs.set(
                tabName,
                new Tab(
                    $("#tab-container", this.#$parent),
                    $("#content", this.#$parent),
                    tabName
                )
            );
        }

        return this.#tabs.get(tabName);
    }

    _addSetting(settingData) {
        console.log({ Adding: settingData });

        let tab = this.addOrGetTab(settingData.tab);
        let group = tab.addOrGetGroup(settingData.group);
        if (settingData.group_html) {
            group.setHTML(settingData.group);
        }

        group.addSetting(settingData);
    } // _addSetting()
} // class SettingsPage

module.exports = SettingsPage;
