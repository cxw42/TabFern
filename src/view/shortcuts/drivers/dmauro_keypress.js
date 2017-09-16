// dmauro_keypress.js: shortcut driver for keypress.js

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['loglevel', 'keypress', 'signals'], factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory(require('loglevel'), require('keypress'),
                                    require('signals'));
    } else {
        // Browser globals (root is window)
        root.dmauro_keypress_driver = factory(root.log, root.keypress, root.signals);
    }
}(this, function (log_orig, keypress, signals) {

    function loginfo(...args) { log_orig.info('TabFern drivers dmauro_keypress.js: ', ...args); };

    /// The module we will return
    let retval = {};

    var listener = null;

    function loadKeyPress(cb) {
        listener = new keypress.Listener();
        cb(null);
    }

    /**
     * @param {Event} evt
     * @param {function} cb
     */
    function handleScriptCb(evt, cb) {
        if ( evt.type === "load" && evt.eventPhase === 2 ) {
            loginfo(`handleScriptCb loaded with timestamp: ${Math.round(evt.timeStamp)}`);
            listener = new keypress.Listener();
            cb(null, retval);
        } else {
            cb( new Error( `${retval.name} failed to load.`, evt) );
        }
    }

    currentKeyBindKeysToSignalsMapping = [];
    currentKeypressListeners = [];

    function clearKeyBindings() {
        listener.unregister_many( currentKeypressListeners );
    }

    function convertKeyBindKeysToSignalsMappingToKeypressListenerConfig(item) {
        return {
            "keys": item.keys,
            "is_unordered": typeof item.unordered !== 'undefined' ? item.unordered : undefined,
            "is_exclusive": typeof item.exclusive !== 'undefined' ? item.exclusive : undefined,
            is_solitary: typeof item.solitary !== 'undefined' ? item.solitary : undefined,
            is_sequence: typeof item.sequence !== 'undefined' ? item.sequence : undefined,
            "on_keydown": function (e) {
                item.signal.dispatch('keydown', arguments);
            },
            "on_keyup": function (e) {
                item.signal.dispatch('keyup', arguments);
                return true
            }
        }
    }

    function applyKeyBindingHooks(keyBindKeysToSignalsMapping) {
        // Duplicate mapping and add signal object to each for pub/sub notifications
        var keyBindKeysToSignalsMappingWithSignals = Object.assign({}, ...Object.keys(keyBindKeysToSignalsMapping).map((item, a, b) => {
            var ret = {
                [item]: keyBindKeysToSignalsMapping[item]
            };
            ret[item].signal = new signals.Signal();
            return ret;
        }));
        currentKeyBindKeysToSignalsMapping = keyBindKeysToSignalsMapping;

        // Prepare for keypress library
        var currentKeypressListeners = [];

        let mapOfKeysUsed = {}, warnUserOfProblem = false;
        Object.keys(currentKeyBindKeysToSignalsMapping).forEach((item) => {
            currentKeyBindKeysToSignalsMapping[item].keys.forEach((keyConfig) => {
                let tempItem = {...currentKeyBindKeysToSignalsMapping[item]};
                tempItem.keys = keyConfig;
                if ( mapOfKeysUsed[keyConfig] ) {
                    loginfo(`${keyConfig} is used twice! ${mapOfKeysUsed[keyConfig]} is overridden by ${item}.`);
                    warnUserOfProblem = true;
                    mapOfKeysUsed[keyConfig] += ` & ${item}`;
                } else {
                   mapOfKeysUsed[keyConfig] = item;
                }

                let entry = convertKeyBindKeysToSignalsMappingToKeypressListenerConfig(tempItem);
                currentKeypressListeners.push(entry);
            })
        });

        // Send to keypress
        listener.register_many( currentKeypressListeners );
    }

    retval = {
        name: 'KeyPress (dmaruo)',
        load: (cb) => { loadKeyPress(cb); },
        unload: (cb) => { loginfo('De-initialization not implemented yet. TODO: Remove Script from page. Clear memory references.'); },
        clearKeyBindings: clearKeyBindings,
        applyKeyBindingHooks: applyKeyBindingHooks
    }

    return retval;

}));
// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
