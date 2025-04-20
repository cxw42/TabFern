/// fancy-settings-jquery.js: Library to create a settings page.
/// A port of the Mootools
/// <https://github.com/frankkohlhepp/store-js>
/// and <https://github.com/frankkohlhepp/fancy-settings>,
/// Copyright (c) 2011 Frank Kohlhepp.
/// This code Copyright (c) 2018, 2025 Chris White.
/// SPDX-License-Identifier: MIT

let $ = require("jquery");

// Utilities /////////////////////////////////////////////////////////////

// Unique ID
let UID = Date.now();
function getUniqueId() {
    return "id" + (UID++).toString(36);
}

// Storage ///////////////////////////////////////////////////////////////

// Singleton implemented using example from MDN:
// <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties#simulating_private_constructors>
class Store {
    // --- Singleton support ---

    static #instance = null;
    static #constructing = false;

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
        const itemName = Store.#itemName(name);
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
        const itemName = Store.#itemName(name);
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
        const itemName = Store.#itemName(name);
        localStorage.removeItem(itemName);
    }
} // class Store

// Individual settings ///////////////////////////////////////////////////

// Base class for an individual setting
class Setting {
    _name; // The name of the setting in the store
    #type; // The type of the setting
    _$setting; // The top-level JQuery element of this setting
    _$contents; // for subclasses to fill in
    _searchKey;

    constructor($parent, settingData) {
        this._searchKey = [
            settingData.tab,
            settingData.group,
            settingData.label || "",
            settingData.text || "",
        ].join(" ");

        this._name = settingData.name;
        this.#type = settingData.type;

        this._$setting = $('<div class="setting bundle"/>');
        this._$setting.addClass(this.#type);
        this._$contents = $('<div class="setting container"/>');
        this._$contents.addClass(this.#type);

        this._$setting.append(this._$contents);

        $parent.append(this._$setting);
    }

    get type() {
        return this.#type;
    }

    get searchKey() {
        return this._searchKey;
    }

    // Remove the setting from the DOM.  After this is called, you can no
    // longer use this Setting instance.
    remove() {
        this._$setting.remove();
        this._name = null;
        this.#type = null;
        this._$setting = null;
        this._$contents = null;
    }
} // class Setting

class Pushbutton extends Setting {
    constructor($parent, settingData) {
        if (!settingData.id) {
            throw new Error(`Button must have an ID (${settingData})`);
        }

        super($parent, settingData);

        let $button = $('<input class="setting element button" type="button">');
        $button.attr("id", settingData.id);
        $button.attr("value", settingData.text);

        this._$contents.append($button);
    }
} // class Pushbutton

class Checkbox extends Setting {
    #$checkbox;

    constructor($parent, settingData) {
        super($parent, settingData);

        const id = getUniqueId();
        const storedValue = Boolean(Store.getInstance().get(this._name));
        this.#$checkbox = $(
            '<input class="setting element checkbox" type="checkbox">'
        );
        this.#$checkbox.attr("id", id);
        this.#$checkbox.prop("checked", storedValue);
        this.#$checkbox.on("change", () => {
            this._onChange();
        });

        let $label = $('<label class="setting label checkbox">');
        $label.attr("for", id);
        $label.html(settingData.label);

        this._$contents.append(this.#$checkbox);
        this._$contents.append($label);
    }

    _onChange() {
        const isClicked = Boolean(this.#$checkbox.prop("checked"));
        Store.getInstance().set(this._name, isClicked);
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

// Special-purpose Setting subclass for the "no search results" message.
// This is a hack to port the existing search behaviour from fancy-settings.
class NoSearchResults extends Description {
    constructor($parent) {
        super($parent, {
            type: "description",
            text: "No matches were found.",
        });
        this._$setting.attr("id", "nothing-found");
    }

    show() {
        this._$setting.addClass("show");
    }

    hide() {
        this._$setting.removeClass("show");
    }
} // class NoSearchResults

class RadioButtons extends Setting {
    constructor($parent, settingData) {
        super($parent, settingData);

        this._searchKey =
            this._searchKey +
            " " +
            settingData.options.map((opt) => opt.text).join(" ");

        if (settingData.label) {
            let $label = $('<label class="setting label radio-buttons">');
            $label.text(settingData.label);
            this._$contents.append($label);
        }

        // Create the radio buttons.  Select the first unless a different
        // value is stored.
        const buttonSetID = getUniqueId();
        const storedValue = String(
            Store.getInstance().get(settingData.name) || ""
        );
        let first = true;
        for (const button of settingData.options || []) {
            const buttonID = getUniqueId();

            let $div = $('<div class="setting container radio-buttons">');

            let $button = $(
                '<input class="setting element radio-buttons" type="radio">'
            );

            $button.attr("id", buttonID);
            $button.attr("name", buttonSetID);
            $button.attr("value", button.value);

            if (first || button.value === storedValue) {
                $button.prop("checked", true);
            }
            first = false;

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

            $button.on("change", (event) => {
                this._onChange(event.target);
            });

            this._$contents.append($div);
        }
    } // ctor

    _onChange(target) {
        const newValue = $(target).attr("value");
        Store.getInstance().set(this._name, newValue);
    } // _onChange()
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
        const storedValue = String(
            Store.getInstance().get(settingData.name) || ""
        );
        if (storedValue) {
            $select.prop("value", storedValue);
        }

        $select.on("change", (event) => {
            this._onChange(event.target);
        });

        this._$contents.append($select);
    }

    _onChange(target) {
        const newValue = $(target).prop("value");
        Store.getInstance().set(this._name, newValue);
    } // _onChange()
} // class Dropdown

class InputBox extends Setting {
    #$entry;

    constructor($parent, settingData) {
        super($parent, settingData);

        if (settingData.label) {
            let $label = $('<label class="setting label text">').html(
                settingData.label
            );
            this._$contents.append($label);
        }

        this.#$entry = $('<input class="setting element text" type="text">');
        if (settingData.id) {
            this.#$entry.attr("id", settingData.id);
        }

        const storedValue = String(
            Store.getInstance().get(settingData.name) || ""
        );
        this.#$entry.prop("value", storedValue);

        this.#$entry.on("change", (event) => {
            this._onChange(event.target);
        });

        this._$contents.append(this.#$entry);
    }

    _onChange(target) {
        const newValue = $(target).prop("value");
        Store.getInstance().set(this._name, newValue);
    } // _onChange()
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
    #settings = [];

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
        const setting = newSetting(this.#$content, settingData);
        this.#settings.push(setting);
        return setting;
    }

    clear() {
        for (let setting of this.#settings) {
            setting.remove();
        }
        this.#settings.length = 0;
    } // clear()
} // class Group

class Tab {
    #$tab;
    #$content;
    #groups = new Map();

    // tabParent and contentId are optional
    constructor(tabParent, contentParent, tabName, contentId) {
        console.debug({ Adding_tab: tabName });

        this.#$content = $('<div class="tab-content"/>');
        this.#$content.append($("<h2>").text(tabName));
        contentParent.append(this.#$content);

        if (contentId) {
            this.#$content.attr("id", contentId);
        }

        if (tabParent) {
            this.#$tab = $('<div class="tab"></div>');
            this.#$tab.text(tabName);
            tabParent.append(this.#$tab);

            this.#$tab.on("click", () => {
                this.show();
            });
        }
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

    clear() {
        for (let [key, group] of this.#groups) {
            group.clear();
        }
        this.#groups.clear();
    } // clear()
} // class Tab

// Top-level class ///////////////////////////////////////////////////////

class SettingsPage {
    #$parent;
    #manifest;
    #tabs = new Map();
    #searchResultTab;
    #searchKeyToSettingData = new Map();

    // Search state
    #noSearchResults; // NoSearchResults instance

    // --- Creation ------------------------------------------------------

    // callback is called asynchronously after completion and passed `this`.
    constructor(parent, manifest, callback = undefined) {
        this.#$parent = $(parent);
        this.#manifest = manifest;

        // Create and fill in elements
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

        // Create the settings
        for (const setting of manifest.settings || []) {
            this._addSetting(setting);
        }

        // Show the first group
        if (this.#tabs.size > 0) {
            this.#tabs.values().next().value.show();
        }

        // Set up search logic
        this._setupSearch(this.#$parent);

        // All done!
        if (callback) {
            window.setTimeout(callback, 0, this);
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
            <div id="content" />
        `);

        this.#searchResultTab = new Tab(
            null, // no visible tab
            $("#content", this.#$parent),
            "Search",
            "search-result-container"
        );
    }

    _addSetting(settingData) {
        console.debug({ Adding: settingData });

        let tab = this.addOrGetTab(settingData.tab);
        let group = tab.addOrGetGroup(settingData.group);
        if (settingData.group_html) {
            group.setHTML(settingData.group);
        }

        const setting = group.addSetting(settingData);

        this.#searchKeyToSettingData.set(setting.searchKey, settingData);
    } // _addSetting()

    // --- Runtime behaviour ---------------------------------------------

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
    } // addOrGetTab()

    // Given a tab index 0..ntabs-1, switch to that tab.
    // The string "last" is an alias for `ntabs-1`.
    // On error, does nothing.
    activateTab(indexOrKeyword) {
        const allTabs = [...this.#tabs.values()];

        let whichTab = -1; // If other than -1, select that tab

        do /* once */ {
            if (String(indexOrKeyword).toLowerCase() === "last") {
                whichTab = allTabs.length - 1;
                break;
            }

            // Check for a tab number
            let tabnum = Number(indexOrKeyword);
            if (isNaN(tabnum)) {
                break;
            }

            tabnum = tabnum | 0;
            if (tabnum >= 0 && tabnum < allTabs.length) {
                whichTab = tabnum;
                break;
            }
        } while (0);

        if (whichTab !== -1) {
            allTabs[whichTab].show();
        }
    } // activateTab()

    // --- Search --------------------------------------------------------

    _setupSearch($parent) {
        this.#noSearchResults = new NoSearchResults(
            $("#search-result-container", this.#$parent)
        );

        const $searchBox = $("#search", $parent);
        const onChange = (event) => this._searchOnChange(event.target);
        $searchBox.on("keyup", onChange);
        $searchBox.on("search", onChange);
    } // _setupSearch()

    _searchOnChange(target) {
        const newValue = $(target).prop("value");
        if (newValue) {
            this._searchFor(newValue);
        } else {
            this._searchClear();
        }
    } // _searchOnKeyup

    _searchFor(value) {
        this.#$parent.addClass("searching");

        // Find the search results
        let searchResults = [];
        this.#searchKeyToSettingData.forEach((settingData, searchKey) => {
            if (
                searchKey.toLowerCase().includes(value) &&
                settingData.type != "description"
            ) {
                searchResults.push(settingData);
            }
        });

        // Display the search results
        console.log({ ["Search results"]: searchResults });
        const $searchParent = $("#search-result-container", this.#$parent);
        $searchParent.children("table").remove();
        this.#searchResultTab.clear();

        if (!searchResults.length) {
            this.#noSearchResults.show();
        } else {
            this.#noSearchResults.hide();
            for (const settingData of searchResults) {
                let group = this.#searchResultTab.addOrGetGroup(
                    settingData.group
                );

                if (settingData.group_html) {
                    group.setHTML(settingData.group);
                }

                const setting = group.addSetting(settingData);
            }
        }
    } // _searchFor()

    _searchClear() {
        this.#$parent.removeClass("searching");
        this.#noSearchResults.hide();
        this.#searchResultTab.clear();
    } // _searchClear
} // class SettingsPage

module.exports = SettingsPage;
