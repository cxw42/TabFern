// settings.js: Main file for the TabFern settings page

/// An object to hold the settings for later programmatic access
let settingsobj;

let Modules={}, ASQ, log;

// open tab specified in a query parm, if known.
// See https://stackoverflow.com/a/12151322/2877364
// Use location.hash instead of location.search since Chrome doesn't
// seem to navigate to chrome-extension://...&... .
function jumpByHash(hash, settings)
{
    let searchParams = new URLSearchParams(hash.slice(1));
    if(searchParams.has('open')) {
        let whichtab = -1;  // If other than -1, select that tab

        let openval = String(searchParams.get('open'));     // Do we need the explicit String()?
        let tabNames = Object.keys(settings.tabs);
            // These come out in definition order, as far as I know

        // Check for a tab number.  Positive are from the start (0);
        // negative are from the end (-1 => last).
        let tabnum = Number(openval);
        if( isFinite(tabnum) && (tabnum|0)>=0 && (tabnum|0)<tabNames.length
        ) {
            whichtab = (tabnum|0);
        } else if( isFinite(tabnum) && (tabnum|0)<0 ) {
            let ofs = -(tabnum|0);
            if(ofs>=1 && ofs<=tabNames.length)
                whichtab = tabNames.length - ofs;
        }

        // Check for "last" as a special value
        if(whichtab === -1 && openval.toLowerCase()==='last') {
            whichtab = tabNames.length-1;
        }

        // Jump to that tab.
        if(whichtab !== -1) {
            settings.tabs[tabNames[whichtab]].bundle.activate();
        }

    } //endif &open=... parameter specified
} //jumpByHash

/// Add the
function populatePlugins(settings)
{
    ASQ().then(function(done){
        chrome.storage.local.get(SK_PLUGINS, CC(done));
    })
    .then(function(done, loaded){
        if(!loaded[SK_PLUGINS]) return done.abort();
        let items = loaded[SK_PLUGINS];
        if(!isObject(items) || items.version !== 1 || !isObject(items.plugins))
            return done.abort();

        for(let [id, plugin] of Object.entries(items.plugins)) {
            if(!plugin.name || !plugin.indexUrl) {
                log.warn(`Skipping plugin ${id} (${plugin})`);
                continue;
            }

            if(!plugin.short_name) plugin.short_name = plugin.name;

            let setting = settings.create({
                "tab": i18n.get("Plugins"),
                "group": i18n.get(plugin.short_name),
                "type": "checkbox",
                "label": "Enabled",
                // no "name", so changes won't be persisted in localStorage
            });

            setting.set(items.plugins[id].enabled, true);   //true => no event

            setting.element.addEvent('change',function(evt){
                items.plugins[id].enabled = this.checked;
                console.log(`Plugin ${id} is ${this.checked?'enabled':'disabled'}`);
                chrome.storage.local.set({[SK_PLUGINS]:items},ignore_chrome_error);
                    // TODO? move writes to background so back-to-back writes
                    // are serialized?  Persist plugin state in background?
            });

            // TODO later: add options for this plugin.

        } //foreach plugin
        done();
    });

} //populatePlugins


function onLoad()
{
    // Option 1: Use the manifest:
    new FancySettings.initWithManifest(function (settings) {
        settingsobj = settings;
        //settings.manifest.myButton.addEvent("action", function () {
        //    alert("You clicked me!");
        //});

        jumpByHash(window.location.hash, settings);

        populatePlugins(settings);
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
} //onLoad

function main()
{
    ASQ = Modules['asq.src'];
    log = Modules.loglevel;
    callbackOnLoad(onLoad);
}

require_invoke(['asq.src','common/plugin','loglevel'], main,
                    Modules, {plugin:'common/plugin'});

// vi: set ts=4 sts=4 sw=4 et ai fo-=ro: //
