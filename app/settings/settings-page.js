/// settings-page.js: Create a settings page
/// Copyright (c) 2018, 2025 Chris White.  Based on
/// https://github.com/frankkohlhepp/store-js,
/// Copyright (c) 2011 Frank Kohlhepp.
/// SPDX-License-Identifier: MIT

if (false) {
    // bundle these
    require("vendor/common");
}

let $ = require("jquery");

class Group {
    #$group;

    constructor(parent, groupName) {
        this.#$group = $('<table class="setting group">');
        $(parent).append(this.#$group);
    }
}

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
    } // ctor

    show() {
        this.#$tab.addClass("active");
        this.#$content.addClass("show");
    } // show()

    addOrGetGroup(groupName) {
        if (!this.#groups.has(groupName)) {
        }

        return this.#groups.get(groupName);
    } // addOrGetGroup()
} // class Tab

class SettingsPage {
    #$parent; // parent element, as jquery
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

    _addSetting(setting) {
        console.log({ Adding: setting });

        if (!this.#tabs.has(setting.tab)) {
            this.#tabs.set(
                setting.tab,
                new Tab($("#tab-container"), $("#content"), setting.tab)
            );
        }
        let tab = this.#tabs.get(setting.tab);

        group = tab.addOrGetGroup(setting.group);
    } // addSetting()
} // class SettingsPage

module.exports = SettingsPage;
