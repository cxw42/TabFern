// app/mv3-converter/mv3-converter.js - handle localStorage in an mv3 world

if (false) {
    // Vendor files - listed here only so they'll be bundled
    require("process/browser");
    require("vendor/common");
}

const S = require("common/setting-accessors");

console.log("Setting option defaults");

// Set the defaults for the options.  The settings boilerplate from
// extensionizr does not appear to have this facility.
for (let opt in S.defaults) {
    if (!opt.startsWith("_")) {
        S.setIfNonexistentOrInvalid(opt, S.defaults[opt]);
    }
}

/// Tell the background page values from localSettings it needs to know.
function reportSettings() {
    console.log("Reporting settings");
    const shouldOpenPopup = S.getBool(S.POPUP_ON_STARTUP);
    chrome.runtime.sendMessage(
        { msg: MSG_REPORT_POPUP_SETTING, shouldOpenPopup },

        // This callback is only for debugging --- all the action happens in
        // the receiver.
        function (resp) {
            if (isLastError()) {
                console.error({
                    ["Couldn't send popup-setting report"]:
                        lastBrowserErrorMessageString(),
                });
            } else {
                console.log({ ["response to popup-setting report"]: resp });
            }
        }
    );
} //reportSettings()

reportSettings();

console.log("Done running mv3-converter.js");
