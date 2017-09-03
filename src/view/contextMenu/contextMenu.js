window._tabFernContextMenu = window._tabFernContextMenu || {};

(function(_tabFernContextMenu) {
    "use strict";

    var log = console.log.bind(console, 'TabFern contextMenu.js:');

    function getEnabledValueFromLocalStorage() {
        return getBoolSetting('ContextMenu.Enabled', false);
    }

    _tabFernContextMenu.isEnabled = function isEnabled() {
        // TODO improve this so it is reactive to disabling it in options
        return getEnabledValueFromLocalStorage();
    };

    /// The shortcuts module, if any
    var shortcutNs = false;

    /**
     *
     * @param {Window} win
     */
    _tabFernContextMenu.installEventHandler = function (win, doc, _shortcutNs = false) {
        shortcutNs = _shortcutNs;

        if ( shortcutNs ) {
            log("installing event handlers using Shortcuts module");
            installKeyListenerFromShortcuts(shortcutNs);
        } else {
            log("installing event handlers using internal");
            installKeyListener(win);
        }
    };

    _tabFernContextMenu.installTreeEventHandler = function(treeobj, _shortcutNs = false) {
        // The standard right-click menu swallows the keyup, so we need
        // to track disengagement of the bypass a different way.
        $(treeobj.element).on('bypass_contextmenu.jstree', function(e, data) {
            // Thanks to https://stackoverflow.com/questions/12801898#comment67451213_12802008
            // by https://stackoverflow.com/users/1543318/brant-sterling-wedel for this idea
            $(window).one('mousemove', function(e) {
                if(e.shiftKey) {
                    bypass.engageBypass();
                    log('bypass engaged when leaving built-in context menu');
                } else {
                    bypass.disengageBypass();
                    log('bypass disengaged when leaving built-in context menu');
                }
            });
        });

    } //installTreeEventHandler()

    /**
     * You can call proxyfunc with the items or just return them, so we just
     * return them.
     * @param node
     * @returns {actionItemId: {label: string, action: function}, ...}, or
     *          false for no menu.
     */
    _tabFernContextMenu.generateJsTreeMenuItems = function(node, UNUSED_proxyfunc, e) {

        if ( bypass.isBypassDisengaged() ) {
            e.preventDefault();
        } else {
            return false;
        }

        log('rawr', node.data.nodeType);

        // The default set of all items
        // TODO move this out to a function in view.js
        var items = {
            grabWindowItem: {
                label: "Move window to here (not yet implemented)",
                action: function () {
                    // debugger;    // <-- a manual breakpoint
                    return;
                    let win_id;
                    if(node.data.nodeType === 'window') {
                        if(node.data.win) {
                            win_id = node.data.win.id;
                        }
                    } else if(node.data.nodeType === 'tab') {
                        // TODO get the tab ID, then the window ID.
                    } else {
                        return;
                    }

                    if(win_id) {
                        //TODO
                    }
                } //grabWindowItem action()
            }
        };

        if(!node.data.isOpen) {
            delete items.grabWindowItem;
        }

        // Don't return {} --- that seems to cause jstree to not properly
        // remove the jstree-context style.
        return Object.keys(items).length > 0 ? items : false ;
            // https://stackoverflow.com/a/4889658/2877364 by
            // https://stackoverflow.com/users/7012/avi-flax

    };

    // <span class="contextMenu-entryTitle">Tip: Native Chrome context menu can be opened by Right Click with <span class="shortCutKey">Shift</span> pressed</span></il></il></ul>


        ///////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////
        //
        // H E L P E R    F U N C T I O N S
        //
        ///////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////

        /// State tracker for the bypass
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
                if(treeobj && treeobj._data && treeobj._data.contextmenu) {
                    // not loaded if context menu is disabled.
                    // TODO? update this so it can be used to bypass other
                    // menus?  E.g., the hamburger menu.
                    treeobj._data.contextmenu.bypass = false;
                }
            },
            engageBypass: function () {
                this.engaged = true;
                if(treeobj && treeobj._data && treeobj._data.contextmenu) {
                    treeobj._data.contextmenu.bypass = true;
                }
            }
        };

        /// Listens for keyup events using jquery events.
        /// @param {Window} win
        function installKeyListener(win) {
            $(win).on('keydown', function(e) {
                // Shift
                if ( e.which === 16 ) {
                    log('engage bypass');
                    bypass.engageBypass();
                }
            });
            $(win).on('keyup',function(e) {
                // Shift
                if ( e.which === 16 ) {
                    log('disengage bypass');
                    bypass.disengageBypass();
                }

                // Escape
                //if ( e.which === 27 ) {
                //    //toggleMenuOff();      // This seems to be a fossil - toggleMenuOff() is not defined anywhere I can see
                //}
            });

        } //installKeyListener()

        /// Listens for keyup events using shortcut driver
        /// @param {_tabFernShortcuts} shortcutNs
        function installKeyListenerFromShortcuts(shortcutNs) {
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
// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
