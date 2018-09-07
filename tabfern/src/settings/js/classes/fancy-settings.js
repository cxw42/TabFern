//
// Copyright (c) 2011 Frank Kohlhepp
// https://github.com/frankkohlhepp/fancy-settings
// License: LGPL v2.1
//
// modified by cxw42 2018
(function () {
    var FancySettings = this.FancySettings = new Class({
        "tabs": {},

        "initialize": function (name, icon, settingsLabel, searchLabel, nothingFoundMessage) {
            // Set title and icon
            $("title").set("text", name);
            $("favicon").set("href", icon);
            $("icon").set("src", icon);
            $("settings-label").set("text", (settingsLabel || "Settings"));
            $("search-label").set("text", (searchLabel || "Search"));
            $("search").set("placeholder", (searchLabel || "Search") + "...");

            this.tab = new Tab($("tab-container"), $("content"));
            this.search = new Search($("search"), $("search-result-container"), nothingFoundMessage);
        },

        "create": function (params) {
            var tab,
                group,
                row,
                content,
                bundle;

            // Create tab if it doesn't exist already
            if (this.tabs[params.tab] === undefined) {
                this.tabs[params.tab] = {"groups":{}};
                tab = this.tabs[params.tab];

                tab.content = this.tab.create();
                tab.content.tab.set("text", params.tab);
                this.search.bind(tab.content.tab);

                //stash the bundle so we can call bundle.activate() later
                tab.bundle = tab.content;

                tab.content = tab.content.content;
                (new Element("h2", {
                    "text": params.tab
                })).inject(tab.content);
            } else {
                tab = this.tabs[params.tab];
            }

            // Create group if it doesn't exist already
            if (tab.groups[params.group] === undefined) {
                tab.groups[params.group] = {};
                group = tab.groups[params.group];

                group.content = (new Element("table", {
                    "class": "setting group"
                })).inject(tab.content);

                row = (new Element("tr")).inject(group.content);

                var group_parms = { "class": "setting group-name" };
                group_parms[params.group_html ? 'html' : 'text'] = params.group;
                (new Element("td", group_parms)).inject(row);

                content = (new Element("td", {
                    "class": "setting group-content"
                })).inject(row);

                group.setting = new Setting(content);
            } else {
                group = tab.groups[params.group];
            }

            // Create and index the setting
            bundle = group.setting.create(params);
            this.search.add(bundle);

            return bundle;
        },

        "align": function (settings) {
            var types,
                type,
                maxWidth;

            types = [
                "text",
                "button",
                "slider",
                "popupButton"
            ];
            type = settings[0].params.type;
            maxWidth = 0;

            if (!types.contains(type)) {
                throw "invalidType";
            }

            settings.each(function (setting) {
                if (setting.params.type !== type) {
                    throw "multipleTypes";
                }

                var width = setting.label.offsetWidth;
                if (width > maxWidth) {
                    maxWidth = width;
                }
            });

            settings.each(function (setting) {
                var width = setting.label.offsetWidth;
                if (width < maxWidth) {
                    if (type === "button" || type === "slider") {
                        setting.element.setStyle("margin-left", (maxWidth - width + 2) + "px");
                        setting.search.element.setStyle("margin-left", (maxWidth - width + 2) + "px");
                    } else {
                        setting.element.setStyle("margin-left", (maxWidth - width) + "px");
                        setting.search.element.setStyle("margin-left", (maxWidth - width) + "px");
                    }
                }
            });
        }
    });

    FancySettings.__proto__.initWithManifest = function (callback) {
        var settings,
            output;

        settings = new FancySettings(manifest.name, manifest.icon,
                manifest.settingsLabel, manifest.searchLabel,
                manifest.nothingFoundMessage);
        settings.manifest = {};

        manifest.settings.each(function (params) {
            output = settings.create(params);
            if (params.name !== undefined) {
                settings.manifest[params.name] = output;
            }
        });

        if (manifest.alignment !== undefined) {
            document.body.addClass("measuring");
            manifest.alignment.each(function (group) {
                group = group.map(function (name) {
                    return settings.manifest[name];
                });
                settings.align(group);
            });
            document.body.removeClass("measuring");
        }

        if (callback !== undefined) {
            callback(settings);
        }
    };
}());
// vi: set ts=4 sts=4 sw=4 et ai: //
