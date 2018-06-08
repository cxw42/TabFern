/// An object to hold the settings for later programmatic access
let settingsobj;

function createPicker($$)
{
    let picker = $$('#scrollbar-color-picker-label');

    // Replace the manifest entry with the color picker
    $$(picker).spectrum({
        showInput: true,
        allowEmpty:true,
        showInitial: true,
        preferredFormat: 'hex',
        color: getStringSetting(CFGS_SCROLLBAR_COLOR),
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

        setSetting(CFGS_SCROLLBAR_COLOR, colorstring);
    });
} //createPicker

window.addEvent("domready", function () {
    let $$ = jQuery;    // since $ is mootools

    // Option 1: Use the manifest:
    new FancySettings.initWithManifest(function (settings) {
        settingsobj = settings;
        //settings.manifest.myButton.addEvent("action", function () {
        //    alert("You clicked me!");
        //});

        // ----------------------------
        // Create the color-picker for the skinny scrollbars
        createPicker($$);

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
});
// vi: set ts=4 sts=4 sw=4 et ai: //
