/// settings-page.js: Create a settings page
/// Copyright (c) 2018, 2025 Chris White.  Based on
/// https://github.com/frankkohlhepp/store-js,
/// Copyright (c) 2011 Frank Kohlhepp.
/// SPDX-License-Identifier: MIT

if(false) { // bundle these
    require('vendor/common');
}

let $ = require('jquery');

class Tab
{
    #tab;
    #content;

    constructor(tab_parent, content_parent, tab_name)
    {
        console.log({Adding_tab: tab_name});
        this.#tab = $('<div class="tab"></div>');
        this.#tab.text(tab_name);
        tab_parent.append(this.#tab);

        this.#content = $('<div class="tab-content"/>');
        this.#content.append($('<hr>'));
        this.#content.append($('<h1>').text(tab_name));
        content_parent.append(this.#content);
    }

} // class Tab

class SettingsPage
{
    #$parent;   // parent element, as jquery
    #manifest;
    #tabs = {};

    constructor(parent, manifest)
    {
        this.#$parent = $(parent);
        this.#manifest = manifest;

        this._createSkeleton(this.#$parent);

        if(manifest.title) {
            this.#$parent[0].ownerDocument.title = manifest.title;
        }
        if(manifest.label) {
            $('#settings-label', this.#$parent).text(manifest.label);
        }
        if(manifest.icon) {
            $('#icon', this.#$parent).attr('src', manifest.icon);
        }

        for(const setting of (manifest.settings || [])) {
            this._addSetting(setting);
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
        `)
    }

    _addSetting(setting) {
        console.log({Adding: setting});

        if(!(setting.tab in this.#tabs)) {
            this.#tabs[setting.tab] = new Tab(
                $('#tab-container'), $('#content'), setting.tab
            );
        }
        let tab = this.#tabs[setting.tab];

        // TODO RESUME HERE --- add group if it's missing
    } // addSetting()

} // class SettingsPage

module.exports = SettingsPage;
