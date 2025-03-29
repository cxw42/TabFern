// app/common/setting-accessors.js - Access to the settings
// Part of TabFern

const SD = require("common/setting-definitions");

// Setting-related functions // {{{1

// Defined by fancy-settings
const SETTING_PREFIX = "store.settings.";

/// Get the raw value of a setting.  Returns null if the key doesn't exist.
/// @param setting_name     A value in SD.names
function getRawSetting(setting_name) {
    return localStorage.getItem(SETTING_PREFIX + setting_name);
} //getSetting

/// Get the string value of a setting, if it is a string.
/// @param setting_name     A value in SD.names
/// @param default_value    Optional default.  If unspecified or
///                         undefined, the default from SD.defaults
///                         is used.
function getStringSetting(setting_name, default_value = undefined) {
    if (typeof default_value === "undefined" && setting_name in SD.defaults) {
        default_value = SD.defaults[setting_name];
    }

    let locStorageValue = localStorage.getItem(SETTING_PREFIX + setting_name);

    if (locStorageValue !== null) {
        // key exists
        // Get the value, which is stored as JSON
        try {
            let val = JSON.parse(locStorageValue);
            if (typeof val === "string") return val;
        } catch (e) {
            // do nothing
        }
    }

    // If we get here, we didn't have a value, or didn't have a string.
    return String(default_value);
} //getStringSetting

/// Get a boolean setting from the settings page, which uses HTML5 localStorage.
/// @param setting_name     A value in SD.names
/// @param default_value    Optional default.  If unspecified or
///                         undefined, the default from SD.defaults
///                         is used.
function getBoolSetting(setting_name, default_value = undefined) {
    if (typeof default_value === "undefined" && setting_name in SD.defaults) {
        default_value = SD.defaults[setting_name];
    }

    let locStorageValue = localStorage.getItem(SETTING_PREFIX + setting_name);

    if (locStorageValue === null) {
        // nonexistent key
        return default_value;
    } else {
        // Get the value, which is stored as JSON
        let str = String(locStorageValue).toLowerCase();
        if (str === "false") {
            return false;
        } else if (str === "true") {
            return true;
        } else {
            return default_value;
        }
    }
} //getBoolSetting

/// Get an integer setting from the settings page.
/// @param setting_name     A value in CFG_NAMES
/// @param default_value    Optional default.  If unspecified or
///                         undefined, the default from SD.defaults
///                         is used.
function getIntSetting(setting_name, default_value = undefined) {
    if (typeof default_value === "undefined" && setting_name in SD.defaults) {
        default_value = SD.defaults[setting_name];
    }

    let locStorageValue = localStorage.getItem(SETTING_PREFIX + setting_name);

    if (locStorageValue === null) {
        // nonexistent key
        return default_value;
    } else {
        const str = String(locStorageValue);
        let val = JSON.parse(locStorageValue); // stored with double-quotes
        val = SD.validate_int(val);
        if (typeof val === "undefined") {
            return default_value;
        } else {
            return val;
        }
    }
} //getIntSetting

/// Find out whether the given setting from the settings page exists.
/// @param setting_name     A value in SD.names
function haveSetting(setting_name) {
    if (!setting_name) return false;
    return SETTING_PREFIX + setting_name in localStorage;
} //haveSetting()

/// Set a setting (wow!).
/// @param setting_name {String} A value in SD.names
/// @param setting_value {mixed} The value, which must be
/// JSON.stringify()able.
function setSetting(setting_name, setting_value) {
    // TODO handle exceptions in some reasonable way.
    localStorage.setItem(
        SETTING_PREFIX + setting_name,
        JSON.stringify(setting_value)
    ); // JSON stringify so we can store more than just strings.
} //setSetting

/// Set a setting only if:
/// - it's not already there, or
/// - it is there, but its value fails validation.
/// Parameters are as setSetting().
function setSettingIfNonexistentOrInvalid(setting_name, setting_value) {
    let shouldSet = false;
    let value;

    // Is the value missing?
    if (!haveSetting(setting_name)) {
        shouldSet = true;
    }

    // Is the value malformed?
    if (!shouldSet) {
        const value_json = getRawSetting(setting_name);

        try {
            value = JSON.parse(value_json);
        } catch (e) {
            shouldSet = true;
        }
    }

    // Does the value pass validation?
    if (!shouldSet) {
        if (typeof SD.validators[setting_name](value) === "undefined") {
            shouldSet = true;
        }
    }

    // Set if we need to
    if (shouldSet) {
        setSetting(setting_name, setting_value);
    }
} //setSettingIfNonexistentOrInvalid

/// Remove a setting
function removeSetting(setting_name) {
    localStorage.removeItem(SETTING_PREFIX + setting_name);
} //removeSetting

/// Custom getter for the current theme name.  This enforces known themes.
function getThemeName() {
    let theme = getStringSetting(SD.names.CFGS_THEME_NAME);
    if (theme === "default" || theme === "default-dark") return theme;
    else return SD.defaults[CFGS_THEME_NAME];
} //getThemeName

////////////////////////////////////////////////////////////////////////// }}}1
// Exports // {{{1

/// The object we will export
let me = {
    // settings (forwarded from setting-definitions)
    names: SD.names,
    defaults: SD.defaults,
    validators: SD.validators,

    // special values settings can take on (forwarded from setting-definitions)
    TRUE_S: SD.TRUE_S,
    FALSE_S: SD.FALSE_S,

    // FAVICON_SOURCE values (forwarded from setting-definitions)
    FAVICON_SITE: SD.FAVICON_SITE,
    FAVICON_CHROME: SD.FAVICON_CHROME,
    FAVICON_DDG: SD.FAVICON_DDG,

    // special accessors
    isOROC: () =>
        getStringSetting(SD.names.CFGS_OPEN_REST_ON_CLICK) === SD.TRUE_S,

    // functions
    getRaw: getRawSetting,
    getString: getStringSetting,
    getBool: getBoolSetting,
    getInt: getIntSetting,
    have: haveSetting,
    set: setSetting,
    setIfNonexistentOrInvalid: setSettingIfNonexistentOrInvalid,
    remove: removeSetting,
    getThemeName,
};

// Each of the names is a property directly on the export object,
// with /^CFG/ removed for convenience.
for (let name in SD.names) {
    me[name.replace(/^CFG_/, "").replace(/^CFG/, "")] = SD.names[name];
    // CFG_FOO -> FOO; CFGS_FOO -> S_FOO

    // Shorthand for bools: CFG_FOO -> isFOO()
    if (name.match(/^CFG_/)) {
        me["is" + name.replace(/^CFG_/, "")] = function () {
            return getBoolSetting(me.names[name]);
        };
    }
}

module.exports = me;

////////////////////////////////////////////////////////////////////////// }}}1
// vi: set fo-=o fdm=marker fdl=1: //
