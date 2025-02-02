//
// Copyright (c) 2011 Frank Kohlhepp
// https://github.com/frankkohlhepp/store-js
// License: MIT-license
//
// modified by cxw42 2018
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([],factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.Store = factory();
    }
}(this, function () {
    var Store = function (name, defaults) {
        var key;
        this.name = name;

        if (defaults !== undefined) {
            for (key in defaults) {
                if (defaults.hasOwnProperty(key) && this.get(key) === undefined) {
                    this.set(key, defaults[key]);
                }
            }
        }
    };

    Store.prototype.get = function (name) {
        name = "store." + this.name + "." + name;
        if (await chrome.storage.local.get(name) === null) { return undefined; }
        try {
            return JSON.parse(await chrome.storage.local.get(name));
        } catch (e) {
            return null;
        }
    };

    Store.prototype.set = function (name, value) {
        if (value === undefined) {
            this.remove(name);
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

            await chrome.storage.local.set("store." + this.name + "." + name, value);
        }

        return this;
    };

    Store.prototype.remove = function (name) {
        await chrome.storage.local.remove("store." + this.name + "." + name);
        return this;
    };

    Store.prototype.removeAll = function () {
        var name,
            i;

        name = "store." + this.name + ".";
        var keys = await chrome.storage.local.getKeys();
        for (i = (keys.length - 1); i >= 0; i--) {
            if (keys[i].substring(0, name.length) === name) {
                await chrome.storage.local.remove(keys[i]);
            }
        }

        return this;
    };

    Store.prototype.toObject = function () {
        var values,
            name,
            i,
            key,
            value;

        values = {};
        name = "store." + this.name + ".";
        var keys = await chrome.storage.local.getKeys();
        for (i = (keys.length - 1); i >= 0; i--) {
            if (keys[i].substring(0, name.length) === name) {
                key = keys[i].substring(name.length);
                value = this.get(key);
                if (value !== undefined) { values[key] = value; }
            }
        }

        return values;
    };

    Store.prototype.fromObject = function (values, merge) {
        if (merge !== true) { this.removeAll(); }
        for (var key in values) {
            if (values.hasOwnProperty(key)) {
                this.set(key, values[key]);
            }
        }

        return this;
    };

    return Store;
}));
