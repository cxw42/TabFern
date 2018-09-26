(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['loglevel'], factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory(require('loglevel'));
    } else {
        // Browser globals (root is window)
        root.Shortcuts = factory(root.log);
    }
}(this, function (log_orig) {

    function loginfo(...args) { log_orig.info('TabFern shortcuts.js: ', ...args); };

    /// The module we will export
    let retval = {};

    retval.isEnabled = function() {
        // TODO improve this so it is reactive to disabling it in options
        return getBoolSetting('KeyBinds.Enabled', false);
    };

    /// Gets the driver as `this`
    function driverLoaded(err) {
        if ( err ) {
            loginfo('Driver ' + this.name + ' failed to load.');
        } else {
            loginfo('Driver ' + this.name + ' loaded.');
        }
    }

    var currentDrivers = [];
    var currentBindings = {};

    /**
     * Return a clone of the current key bindings.
     * @returns {*}
     */
    retval.getCurrentKeyBindings = function() {
        return {... currentBindings};
    };

    /**
     * Merge new keybindings object with current key bindings.
     * @returns {*}
     */
    retval.updateKeyBindings = function(newKeybindings) {
        currentBindings = {... currentBindings, ... newKeybindings};
    };

    /**
     * Wholesale replace current key bindings.
     * @returns {*}
     */
    retval.replaceKeyBindings = function(newKeybindings) {
        currentBindings = newKeybindings;
    };


    retval.getKeyBindingFor = function(key) {
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
    retval.install = function (obj, cb) {
        if ( !obj.window) { throw new Error('win is required'); }
        if ( !obj.drivers || !obj.drivers.length ) { throw new Error('driver is required'); }
        if ( !cb || typeof cb !== 'function' ) { throw new Error('cb is required'); }

        if ( retval.isEnabled() === false ) {
            loginfo('Disabled, bailing');
            cb('disabled');
            return;
        }

        loginfo("Installing keyboard listeners");
        loginfo("Initializing keyboard listener drivers");
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
                loginfo("Installing keybind configuration");
                retval.updateKeyBindings(obj.keybindings);
            } else {
                loginfo("No keybind configuration provided");
            }

            currentDrivers.forEach((driver) => {
                driver.applyKeyBindingHooks(retval.getCurrentKeyBindings())
            });

            cb(null);
        }).catch(function(err) {
            cb(err);
        });
    };

    return retval;

}));
// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
