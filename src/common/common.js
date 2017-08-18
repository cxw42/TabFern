// common.js: Only constants and stateless helper functions should be
// in this file.
console.log('TabFern common.js loading');

const MSG_GET_VIEW_WIN_ID = 'getViewWindowID';

/// Get a boolean setting from options_custom, which uses HTML5 localStorage.
function getBoolSetting(setting_name, default_value = false)
{
    let locStorageValue = localStorage.getItem('store.settings.' + setting_name);
    if ( locStorageValue === null ) {
        return default_value;
    } else if ( locStorageValue === "false" ) {
        return false;
    } else if ( locStorageValue === "true" ) {
        return true;
    } else {
        return default_value;
    }
} //getBoolSetting

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
