// bypasser.js: Control a bypassable jstree context menu
// Uses jquery, jstree, loglevel, all of which must be loaded beforehand.

//window._tabFernContextMenu = window._tabFernContextMenu || {};

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals (root is window)
        root.ContextMenuBypasser = factory(root.jQuery);
    }
}(this, function ($) {
//(function(_tabFernContextMenu) {
    "use strict";

    var log = console.log.bind(console, 'TabFern contextMenu.js:');

    // --- Map jstree objects to bypassable-context-menu (BCM) objects ---

//    /// A unique ID for a jstree
//    const JSTREE_IDX_KEY = Symbol.symbol('bcm_jstree_idx');
//    let jstree_curr_idx = 1;    ///< The next index to be assigned.
//    const JSTREE_IDX_NONE = 0;  ///< A jstree we don't know about (falsy).
//
//    /// A mapping from tree object indices to BCM objects
//    let bcm_by_jstree_idx = {};

    /// The prototype for a context-menu-bypass object
    let Proto = {};

    function isEnabled() {
        // TODO improve this so it is reactive to disabling it in options
        return getBoolSetting('ContextMenu.Enabled', false);
    };

    /// The shortcuts module, if any
    var shortcutNs = false;

    /**
     *
     * @param {Window} win
     */
    function installEventHandler(win, _shortcutNs = false) {
        shortcutNs = _shortcutNs;

        if ( shortcutNs ) {
            log("installing event handlers using Shortcuts module");
            installKeyListenerFromShortcuts(shortcutNs);
        } else {
            log("installing event handlers using internal");
            installKeyListener(win);
        }
    } //installEventHandler

    function installTreeEventHandler(treeobj) {
        // The standard right-click menu swallows the keyup, so we need
        // to track disengagement of the bypass a different way.

        treeobj.element.on('bypass_contextmenu.jstree', function(e, data) {
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

    // <span class="contextMenu-entryTitle">Tip: Native Chrome context menu can be opened by Right Click with <span class="shortCutKey">Shift</span> pressed</span></il></il></ul>


    ///////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////
    //
    // H E L P E R    F U N C T I O N S
    //
    ///////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////

    // TODO RESUME HERE - make `bypass` per-instance.

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

    function isBypassed()
    {
        return bypass.isBypassEngaged();
    }

    //////////////////////////////////////////////////////////////////////////
    // INIT //

    /// Create a context-menu-bypass for the jstree at the DOM object
    /// identified by #selector.  The tree must already have been created,
    /// and must have the contextmenu plugin loaded.
    /// @param win {DOM Window} the `window` object
    /// @param treeobj {JSTree} the main jsTree object
    /// @param shortcuts        A keyboard-shortcut helper, if any
    /// @return {mixed} Object on success; null on failure.
    function create(win, treeobj, shortcuts)
    {
        if(!treeobj) return null;

        let retval = Object.create(Proto);
        retval.treeobj = treeobj;

//        // Assign a unique ID to this tree object
//        let treeidx = treeobj[JSTREE_IDX_KEY] || JSTREE_IDX_NONE;
//        if(treeidx === JSTREE_IDX_NONE) {
//            treeidx = treeobj[JSTREE_IDX_KEY] = jstree_curr_idx++;
//        }
//        bcm_by_jstree_idx[treeidx] = retval;

        installEventHandler(win, shortcuts);
        installTreeEventHandler(treeobj);

        retval.isBypassed = isBypassed;
        return retval;
    } //ctor

    return {
        create
    };
}));
//})(window._tabFernContextMenu);

// Module-loader template thanks to
// http://davidbcalhoun.com/2014/what-is-amd-commonjs-and-umd/

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
