window._tabFernContextMenu = window._tabFernContextMenu || {};

(function(_tabFernContextMenu) {

    var log = console.log.bind(console, 'TabFern contextMenu.js:');

    function getEnabledValueFromLocalStorage() {
        let locStorageValue = localStorage.getItem('store.settings.ContextMenu.Enabled');
        if (
            locStorageValue === null
            || locStorageValue === "false"
        ) {
            return false;
        } else if ( locStorageValue === "true" ) {
            return true;
        }
    }

    _tabFernContextMenu.isEnabled = function isEnabled() {
        // TODO improve this so it is reactive to disabling it in options
        return getEnabledValueFromLocalStorage();
    };

    var shortcutNs = false;

    /**
     *
     * @param {Window} win
     */
    _tabFernContextMenu.installEventHandler = function (win, doc, _shortcutNs = false) {
        shortcutNs = _shortcutNs;

        if ( shortcutNs ) {
            log("installing event handlers using Shortcuts module");
            keyupListenerFromShortcuts(shortcutNs);
        } else {
            log("installing event handlers using internal");
            keyupListener(win);
        }
    };

    /**
     *
     * @param node
     * @returns {{renameItem: {label: string, action: action}, deleteItem: {label: string, action: action}}}
     */
    _tabFernContextMenu.generateJsTreeMenuItems = function(node, proxyfunc, e) {

        // The default set of all items
        var items = {
            renameItem: { // The "rename" menu item
                label: "Rename",
                action: function () {
                    debugger;
                }
            },
            deleteItem: { // The "delete" menu item
                label: "Delete",
                action: function () {
                    debugger;
                }
            }
        };

        if ( bypass.isBypassDisengaged() ) {
            e.preventDefault();
        } else {
            return false;
        }

        log('rawr', node.data.nodeType);

        if ($(node).hasClass("folder")) {
            // Delete the "delete" menu item
            delete items.deleteItem;
        }

        return items;

    };

    // <span class="contextMenu-entryTitle">Tip: Native Chrome context menu can be opened by Right Click with <span class="shortCutKey">Shift</span> pressed</span></il></il></ul>

        "use strict";

        //////////////////////////////////////////////////////////////////////////////
        //////////////////////////////////////////////////////////////////////////////
        //
        // H E L P E R    F U N C T I O N S
        //
        //////////////////////////////////////////////////////////////////////////////
        //////////////////////////////////////////////////////////////////////////////

        /**
         * Listens for keyup events.
         * @param {Window} win
         */
        function keyupListener(win) {
            $(win).on('keydown', function(e) {
                // Shift
                if ( e.which === 16 ) {
                    bypass.engageBypass();
                }
            });
            $(win).on('keyup',function(e) {
                // Shift
                if ( e.which === 16 ) {
                    bypass.disengageBypass();
                }

                // Escape
                if ( e.which === 27 ) {
                    toggleMenuOff();
                }
            });
        }

        var bypass = {
            engaged: false,
            isBypassDisengaged: function () {
                return !this.isBypassEngaged();
            },
            isBypassEngaged: function () {
                return !!this.engaged;
            },
            disengageBypass: function () {
                this.engaged = false;
                treeobj._data.contextmenu.bypass = false;
            },
            engageBypass: function () {
                this.engaged = true;
                treeobj._data.contextmenu.bypass = true;
            }
        };

        function keyupListenerFromShortcuts(shortcutNs) {
            var key;

            key = shortcutNs.getKeyBindingFor('BYPASS_CONTEXT_MENU_MOMENTARY_LATCH');
            if ( key && key.signal instanceof signals.Signal ) {
                key.signal.add(function (direction, args) {
                    if (direction === 'keydown') {
                        log('bypassing context menu START', args[1]);
                        bypass.engageBypass();
                    }
                    if (direction === 'keyup') {
                        log('bypassing context menu STOP', args[1]);
                        bypass.disengageBypass();
                    }
                });
            }

            key = shortcutNs.getKeyBindingFor('ESC');
            if ( !key || !(key.signal instanceof signals.Signal) ) {
                throw new Error('Unexpected ESC key bind unavailable?');
            }
            key.signal.add(function(direction, args) {
                // TODO jstree close context menu
            });
        }




    })(window._tabFernContextMenu);
