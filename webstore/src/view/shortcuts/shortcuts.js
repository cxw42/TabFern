window._tabFernShortcuts = window._tabFernShortcuts || {};

(function(_tabFernShortcuts) {

    var log = console.log.bind(console, 'TabFern _tabFernShortcuts.js:');

    _tabFernShortcuts.isEnabled = function isEnabled() {
        // TODO improve this so it is reactive to disabling it in options
        return getBoolSetting('KeyBinds.Enabled', false);
    };

    function driverLoaded(err) {
        if ( err ) {
            log('Driver ' + this.name + ' failed to load.');
        } else {
            log('Driver ' + this.name + ' loaded.');
        }
    }

    var currentDrivers = [];
    var currentBindings = {};

    /**
     * Return a clone of the current key bindings.
     * @returns {*}
     */
    _tabFernShortcuts.getCurrentKeyBindings = function() {
        return {... currentBindings};
    };

    /**
     * Merge new keybindings object with current key bindings.
     * @returns {*}
     */
    _tabFernShortcuts.updateKeyBindings = function(newKeybindings) {
        currentBindings = {... currentBindings, ... newKeybindings};
    };

    /**
     * Wholesale replace current key bindings.
     * @returns {*}
     */
    _tabFernShortcuts.replaceKeyBindings = function(newKeybindings) {
        currentBindings = newKeybindings;
    };


    _tabFernShortcuts.getKeyBindingFor = function(key) {
        return currentBindings[key];
    };

    /**
     *
     * @param {Object} obj
     * @param {Window} obj.window
     * @param {Object} obj.keybindings
     * @param {Object} obj.driver
     * @
     */
    _tabFernShortcuts.install = function (obj, cb) {
        if ( !obj.window) { throw new Error('win is required'); }
        if ( !obj.drivers || !obj.drivers.length ) { throw new Error('driver is required'); }
        if ( !cb || typeof cb !== 'function' ) { throw new Error('cb is required'); }

        if ( _tabFernShortcuts.isEnabled() === false ) {
            log('Disabled, bailing');
            cb('disabled');
            return;
        }

        log("Installing keyboard listeners");
        log("Initializing keyboard listener drivers");
        var driversLoadedPromises = obj.drivers.map((driver) => {
            // Validate driver
            if ( !driver.name || !driver.load ) {
                throw new Error('Invalid driver:', driver);
            }

            // Add to bank
            currentDrivers.push(driver);

            // Provide promise for easy aggregation-check
            var prom = new Promise((resolve, reject) => {
                driver.load(function(err) {
                    driverLoaded.apply(driver, arguments);
                    if ( err )
                        reject(err);
                    else {
                        // Remove error argument and pass along anything else
                        let args = [...arguments]; // Clone arguments
                        args.shift(); // Remove error
                        resolve(...args); // De-array-ify and pass along
                    }
                });
            });
            return prom;
        });
        var driversLoadedPromise = Promise.all(driversLoadedPromises);

        driversLoadedPromise.then(function() {

            if ( obj.keybindings ) {
                log("Installing keybind configuration");
                _tabFernShortcuts.updateKeyBindings(obj.keybindings);
            } else {
                log("No keybind configuration provided");
            }

            currentDrivers.forEach((driver) => {
                driver.applyKeyBindingHooks(_tabFernShortcuts.getCurrentKeyBindings())
            });

            cb(null);
        }).catch(function(err) {
            cb(err);
        });
    };

})(window._tabFernShortcuts);
