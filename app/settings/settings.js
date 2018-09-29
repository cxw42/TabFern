/// settings.js: Main file for TabFern settings page
/// Copyright (c) 2017--2018 Chris White

console.log('TabFern: running ' + __filename);

// A static require statement that brunch will pick up on, but that will never
// actually run.  This is what tells Brunch to include these top-level modules.
if(false) {
    require('vendor/validation');
    require('vendor/common');

    // Hack the fixed order using the filenames because I don't want to
    // clutter the Brunch config with this page-specific material.
    require('vendor/settings/0_store.js');
    require('vendor/settings/1_mootools-core.js');
    require('vendor/settings/2_tab.js');
    require('vendor/settings/3_setting.js');
    require('vendor/settings/4_search.js');
    require('vendor/settings/5_fancy-settings.js');
}

const ExportFile = require('lib/export-file');
const ImportFile = require('lib/import-file');

/// jQuery alias, since $ and $$ are mootools
const $j = require('jquery');

const log = require('loglevel');
const spectrum = require('spectrum-colorpicker');
const Spinner = require('spin.js').Spinner;
const tinycolor = require('tinycolor2');

const S = require('setting-definitions');   // in app/

const manifest = require('./manifest');
window.manifest = manifest; //because fancy-settings pulls from there

/// An object to hold the settings for later programmatic access
let settingsobj;

// Color picker //////////////////////////////////////////////////// {{{1

/// Create the color picker for the scrollbar color.
let createPicker = function createPicker() {
    let picker = $j('#scrollbar-color-picker-label');

    let orig_color = S.getString(S.S_SCROLLBAR_COLOR);
    if(!Validation.isValidColor(orig_color)) {
        orig_color = S.defaults[S.S_SCROLLBAR_COLOR];
    }

    // Replace the manifest entry with the color picker
    $j(picker).spectrum({
        showInput: true,
        allowEmpty:true,
        showInitial: true,
        preferredFormat: 'hex',
        color: orig_color,
    });

    // Add the text that would otherwise have gone in the manifest
    let newlabel = $j('<span>').text(
            'Skinny-scrollbar color ("X" for the default): ')   // TODO i18n
        .addClass('setting label');
    $j(picker).before(newlabel);

    // Handle updates
    $j(picker).on('change.spectrum', (e, newcolor)=>{
        let colorstring;
        if(!newcolor || !newcolor.toString) {
            console.log('New color: default');
            colorstring = S.defaults[S.S_SCROLLBAR_COLOR];
        } else {
            console.log({'New color': newcolor.toString()});
            colorstring = String(newcolor.toString());
        }

        if(!colorstring || Validation.isValidColor(colorstring)) {
            S.set(S.S_SCROLLBAR_COLOR, colorstring);
        } else {
            console.log('Invalid color');
            $j(picker).spectrum('set',orig_color);
        }
    });
}; //createPicker

// }}}1
// Export/Import Settings ////////////////////////////////////////// {{{1

/// Pack the settings into an object to export.
/// TODO automate keeping this in sync with common.js.
function saveSettingsToObject()
{
    let retval = { __proto__: null };
    for(let key in S.defaults) {
        retval[key] = S.getRaw(key);
    }
    return Object.seal(retval);
} //saveSettingsToObject

/// Export the settings
function exportSettings(evt_unused)
{
    let date_tag = new Date().toISOString().replace(/:/g,'.');
        // DOS filenames can't include colons.
        // TODO use local time - maybe
        // https://www.npmjs.com/package/dateformat ?
    let filename = 'TabFern settings backup ' + date_tag + '.tabfern_settings';

    let saved_info = saveSettingsToObject();
    ExportFile(document, JSON.stringify(saved_info), filename);
} //exportSettings()

/// Assign settings from an object we have loaded.
/// TODO automate keeping this in sync with common.js.
function loadSettingsFromObject(obj) {
    let ok = true;
    let errmsgs = '';
    function stash(m) { errmsgs += `<li>${m}</li>`; }

    log.info({'Loading settings from':obj});

    for(let key in S.defaults) {
        if(!obj[key]) {
            log.info(`Setting ${key} not found - skipping`);
            continue;   // not an error
        }

        // Get the value
        let val;
        try {
            val = JSON.parse(String(obj[key]));
        } catch(e) {
            let m = `Non-JSON value for ${key} - skipping`;
            log.warn(m);
            stash(m);
            ok = false;
            continue;
        }

        // Confirm its type
        if(typeof val !== typeof S.defaults[key]) {
            let m = `Setting ${key}: value is a ${typeof val} but should be `+
                    `a ${typeof S.defaults[key]} - skipping`;
            log.warn(m);
            stash(m);
            ok = false;
            continue;
        }

        // Run value-specific checks, e.g., for well-formedness.
        if(S.validators[key]) {
            let val_output = S.validators[key](val);
            if(val_output === undefined) {
                let m = `Setting ${key}: Value ${val} failed validation`;
                log.warn(m);
                //stash(m); // Not user-facing
                val = S.defaults[key];
            } else {
                val = val_output;
            }
        }

        // Set the value
        if(typeof val === 'boolean' || typeof val === 'string') {
            // We already checked that val is of the correct type above,
            // so we can go ahead and set it.
            S.set(key, val);
        } else {    // This shouldn't happen, so it's a log.error if it does.
            let m = `Unexpected type ${typeof val} for ${key} - skipping`;
            log.error(m);
            stash(m);
            ok = false;
            continue;
        }

    } //foreach key

    return {ok, errmsgs};
} //loadSettingsFromObject

/// Import the settings
function importSettings(evt_unused)
{
    function processFile(text, filename) {
        let spinner;
        try {
            spinner = new Spinner().spin(
                $j('#import-settings').parent()[0]
            );
            let parsed = JSON.parse(text);
            let {ok, errmsgs} = loadSettingsFromObject(parsed);
            if(!ok) {
                let elem = $j('<div>').html(
                    '<p>I encountered error(s) while loading the file ' +
                    `'${filename}':</p><ul>${errmsgs}</ul>`);
                $j('#import-settings').after(elem);

            } else {    // success
                // Let ourselves know, after reload, that it worked
                S.set(S.SETTINGS_LOADED_OK, true);

                // refresh all the controls by reloading
                window.location.reload(true);
            }

        } catch(e) {
            window.alert("File " + filename + ' is not something I can '+
                'understand as a TabFern settings file.  ' +
                'Parse error code was: ' + e);
        }
        if(spinner) spinner.stop();
    } //processFile()

    S.set(S.SETTINGS_LOADED_OK, false);
    let importer = ImportFile(document, '.tabfern_settings');
    importer.getFileAsString(processFile);
} //importSettings()

// }}}1
// Main //////////////////////////////////////////////////////////// {{{1

function main()
{
    // Option 1: Use the manifest:
    new FancySettings.initWithManifest(function (settings) {
        $j('#settings-label').text(_T('wsSettings'));

        settingsobj = settings;

        // ----------------------------
        // Finish creating the page
        createPicker();   // Skinny-scrollbar color picker

        // ----------------------------
        // Hook up events
        $j('#import-settings').on('click', importSettings);
        $j('#export-settings').on('click', exportSettings);

        let is_settings_load = false;
        if(S.getBool(S.SETTINGS_LOADED_OK)) {
            is_settings_load = true;
            let elem = $j('<div>').text("Settings loaded");
            $j('#import-settings').after(elem);
            S.set(S.SETTINGS_LOADED_OK, false);
        }

        // ----------------------------
        // open tab specified in a query parm, if known.
        // See https://stackoverflow.com/a/12151322/2877364
        // Use location.hash instead of location.search since Chrome doesn't
        // seem to navigate to chrome-extension://...&... .
        //
        // Note: if we have come from a settings-load event, don't change
        // tabs.  Load-settings is on the first tab, which is the
        // one activated by default.

        let searchParams = new URLSearchParams(window.location.hash.slice(1));
        if(!is_settings_load && searchParams.has('open')) {
            let whichtab = -1;  // If other than -1, select that tab

            let openval = String(searchParams.get('open'));     // Do we need the explicit String()?
            let tabNames = Object.keys(settingsobj.tabs);
                // These come out in definition order, as far as I know

            // Check for a tab number
            let tabnum = Number(openval);
            if(!isNaN(tabnum) && (tabnum|0)>=0 && (tabnum|0)<tabNames.length) {
                whichtab = (tabnum|0);
            }

            // Check for "last" as a special value
            if(whichtab === -1 && openval.toLowerCase()==='last') {
                whichtab = tabNames.length-1;
            }

            // Jump to that tab.
            if(whichtab !== -1) {
                settingsobj.tabs[tabNames[whichtab]].bundle.activate();
            }

        } //endif #open=... parameter specified
    });

} //main()

window.addEvent("domready", main);
// }}}1

// vi: set ts=4 sts=4 sw=4 et ai foldmethod=marker: //
