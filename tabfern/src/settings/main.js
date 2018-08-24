/// An object to hold the settings for later programmatic access
let settingsobj;

/// jQuery alias, since $ is mootools
let $$ = jQuery;

// Color picker //////////////////////////////////////////////////// {{{1

/// Create the color picker for the scrollbar color.
let createPicker = function createPicker() {
    let picker = $$('#scrollbar-color-picker-label');

    let orig_color = getStringSetting(CFGS_SCROLLBAR_COLOR);
    if(!Validation.isValidColor(orig_color)) {
        orig_color = CFG_DEFAULTS[CFGS_SCROLLBAR_COLOR];
    }

    // Replace the manifest entry with the color picker
    $$(picker).spectrum({
        showInput: true,
        allowEmpty:true,
        showInitial: true,
        preferredFormat: 'hex',
        color: orig_color,
    });

    // Add the text that would otherwise have gone in the manifest
    let newlabel = $$('<span>').text(i18n.get(
            'Skinny-scrollbar color ("X" for the default): '))
        .addClass('setting label');
    $$(picker).before(newlabel);

    // Handle updates
    $$(picker).on('change.spectrum', (e, newcolor)=>{
        let colorstring;
        if(!newcolor || !newcolor.toString) {
            console.log('New color: default');
            colorstring = CFG_DEFAULTS[CFGS_SCROLLBAR_COLOR];
        } else {
            console.log({'New color': newcolor.toString()});
            colorstring = String(newcolor.toString());
        }

        if(!colorstring || Validation.isValidColor(colorstring)) {
            setSetting(CFGS_SCROLLBAR_COLOR, colorstring);
        } else {
            console.log('Invalid color');
            $$(picker).spectrum('set',orig_color);
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
    for(let key in CFG_DEFAULTS) {
        retval[key] = getRawSetting(key);
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
    Fileops.Export(document, JSON.stringify(saved_info), filename);
} //exportSettings()

/// Assign settings from an object we have loaded.
/// TODO automate keeping this in sync with common.js.
function loadSettingsFromObject(obj) {
    let ok = true;
    log.info({'Loading settings from':obj});

    for(let key in CFG_DEFAULTS) {
        if(!obj[key]) {
            log.info(`Setting ${key} not found`);
            continue;   // not an error
        }

        // Get the value
        let val;
        try {
            val = JSON.parse(String(obj[key]));
        } catch(e) {
            log.warn(`Non-JSON value for ${key} - skipping`);
            ok = false;
            continue;
        }

        // Confirm its type
        if(typeof val !== typeof CFG_DEFAULTS[key]) {
            log.warn(`Setting ${key}: value is a ${typeof val} but should be `+
                    `a ${typeof CFG_DEFAULTS[key]} - skipping`);
            ok = false;
            continue;
        }

        // TODO add value-specific checks, e.g., for well-formedness.
        if(CFG_VALIDATORS[key]) {
            let val_output = CFG_VALIDATORS[key](val);
            if(val_output === undefined) {
                log.warn(`Setting ${key}: Value ${val} failed validation`);
                val = CFG_DEFAULTS[key];
            } else {
                val = val_output;
            }
        }

        // Set the value
        if(typeof val === 'boolean' || typeof val === 'string') {
            // We already checked that val is of the correct type above,
            // so we can go ahead and set it.
            setSetting(key, val);
        } else {    // This shouldn't happen, so it's a log.error if it does.
            log.error(`Unexpected type ${typeof val} for ${key} - skipping`);
            ok = false;
            continue;
        }

    } //foreach key

    return ok;
} //loadSettingsFromObject

/// Import the settings
function importSettings(evt_unused)
{
    function processFile(text, filename) {
        let spinner;
        try {
            spinner = new Spinner().spin(
                $$('#import-settings').parent()[0]
            );
            let parsed = JSON.parse(text);
            let ok = loadSettingsFromObject(parsed);
            if(!ok) {
                window.alert("I encountered an error while loading the file " +
                                filename);
            } else {    // success
                //let elem = $$('<div>').text(
                //        "Settings loaded from " + filename);
                //$$('#import-settings').after(elem);

                // refresh all the controls by reloading
                window.location.reload(true);
            }
        } catch(e) {
            window.alert("File " + filename + ' is not something I can '+
                'understand as a TabFern settings file.  Parse error code was: ' +
                e);
        }
        if(spinner) spinner.stop();
    } //processFile()

    let importer = Fileops.Importer(document, '.tabfern_settings');
    importer.getFileAsString(processFile);
} //importSettings()

// }}}1
// Main //////////////////////////////////////////////////////////// {{{1

function main()
{
    // Option 1: Use the manifest:
    new FancySettings.initWithManifest(function (settings) {
        $$('#settings-label').text(_T('wsSettings'));

        settingsobj = settings;
        //settings.manifest.myButton.addEvent("action", function () {
        //    alert("You clicked me!");
        //});

        // ----------------------------
        // Finish creating the page
        createPicker();   // Skinny-scrollbar color picker

        // ----------------------------
        // Hook up events
        $$('#import-settings').on('click', importSettings);
        $$('#export-settings').on('click', exportSettings);

        // ----------------------------
        // open tab specified in a query parm, if known.
        // See https://stackoverflow.com/a/12151322/2877364
        // Use location.hash instead of location.search since Chrome doesn't
        // seem to navigate to chrome-extension://...&... .
        let searchParams = new URLSearchParams(window.location.hash.slice(1));
        if(searchParams.has('open')) {
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

        } //endif &open=... parameter specified
    });

    // Option 2: Do everything manually:
    /*
    var settings = new FancySettings("My Extension", "icon.png");

    var username = settings.create({
        "tab": i18n.get("information"),
        "group": i18n.get("login"),
        "name": "username",
        "type": "text",
        "label": i18n.get("username"),
        "text": i18n.get("x-characters")
    });

    var password = settings.create({
        "tab": i18n.get("information"),
        "group": i18n.get("login"),
        "name": "password",
        "type": "text",
        "label": i18n.get("password"),
        "text": i18n.get("x-characters-pw"),
        "masked": true
    });

    var myDescription = settings.create({
        "tab": i18n.get("information"),
        "group": i18n.get("login"),
        "name": "myDescription",
        "type": "description",
        "text": i18n.get("description")
    });

    var myButton = settings.create({
        "tab": "Information",
        "group": "Logout",
        "name": "myButton",
        "type": "button",
        "label": "Disconnect:",
        "text": "Logout"
    });

    // ...

    myButton.addEvent("action", function () {
        alert("You clicked me!");
    });

    settings.align([
        username,
        password
    ]);
    */
} //main()

window.addEvent("domready", main);
// }}}1

// vi: set ts=4 sts=4 sw=4 et ai foldmethod=marker: //
