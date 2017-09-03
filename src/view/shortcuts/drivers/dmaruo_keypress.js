window._tabFernShortcuts = window._tabFernShortcuts || {};
window._tabFernShortcuts.drivers = window._tabFernShortcuts.drivers || {};

(function() {

    function generateLoggerProxyWithPrefixedMessage(msg) {
        return Function.prototype.bind.call(console.log, console, msg);
    }
    var log = generateLoggerProxyWithPrefixedMessage('TabFern _tabFern Drivers dmauro-keypress.js:');

    function isDriverLoaded() {
        return !!( window.keypress );
    }

    var listener = null;

    function loadKeyPress(cb) {
        if ( !isDriverLoaded() ) {
            asyncAppendScriptToHead(
                document,
                '/js/dmauro-Keypress-2.1.3-9-80c0f97/keypress-2.1.4.min.js',
                (evt) => {
                    handleScriptCb(evt, cb);
                }
            );
        } else {
            listener = new window.keypress.Listener();
            cb(null);
        }
    }

    /**
     * @param {Event} evt
     */
    function handleScriptCb(evt, cb) {
        if ( evt.type === "load" && evt.eventPhase === 2 ) {
            log(`handleScriptCb loaded with timestamp: ${Math.round(evt.timeStamp)}`);
            listener = new window.keypress.Listener();
            cb(null, window._tabFernShortcuts.drivers.dmaruo_keypress);
        } else {
            cb(
                new Error(
                    `${window._tabFernShortcuts.drivers.dmaruo_keypress.name} failed to load.`,
                    evt
                )
            );
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
                    log(`${keyConfig} is used twice! ${mapOfKeysUsed[keyConfig]} is overridden by ${item}.`);
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

    window._tabFernShortcuts.drivers.dmaruo_keypress = {
        name: 'KeyPress (dmaruo)',
        isLoaded: isDriverLoaded,
        load: (cb) => { loadKeyPress(cb); },
        unload: (cb) => { log('De-initialization not implemented yet. TODO: Remove Script from page. Clear memory references.'); },
        clearKeyBindings: clearKeyBindings,
        applyKeyBindingHooks: applyKeyBindingHooks
    }

})();