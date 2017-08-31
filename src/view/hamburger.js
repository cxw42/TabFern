// hamburger.js: Hamburger menu for jstree.
// Uses jquery, jstree, jstree-actions, loglevel, common.js, all of which are
// loaded by view.html.
// The actual worker code is in view.js.

window._tabFernHamburgerMenu = window._tabFernHamburgerMenu || {};

/// Set up functions usable by view.js
(function(ham) {

    //////////////////////////////////////////////////////////////////////////
    // EVENTS //

    /// Open a new window with the TabFern homepage.  Also remove the default
    /// tab that appears because we are letting the window open at the
    /// default size.  Yes, this is quite ugly.
    function openAboutWindow()
    {
        chrome.windows.create(
            function(win) {
                if(typeof(chrome.runtime.lastError) === 'undefined') {
                    chrome.tabs.create({windowId: win.id, url: 'https://cxw42.github.io/TabFern/'},
                        function(keep_tab) {
                            if(typeof(chrome.runtime.lastError) === 'undefined') {
                                chrome.tabs.query({windowId: win.id, index: 0},
                                    function(tabs) {
                                        if(typeof(chrome.runtime.lastError) === 'undefined') {
                                            chrome.tabs.remove(tabs[0].id,
                                                function ignore_error() { void chrome.runtime.lastError; }
                                            ); //tabs.remove
                                        }
                                    } //function(tabs)
                                ); //tabs.query
                            }
                        } //function(keep_tab)
                    ); //tabs.create
                }
            } //function(win)
        ); //windows.create
    }

    function getMenuItems(node, UNUSED_proxyfunc, e)
    {
        return {
            infoItem: {
                label: "About, help, and credits",
                action: openAboutWindow
            }
        };
    } //getMenuItems()

    /// Replace left clicks with right clicks.
    ///     - There is only one item, so whenever it is selected, deselect it.
    ///     - Also, make left click trigger a context menu.
    function hamOnSelect(evt, evt_data)
    {
        ham.treeobj.deselect_all(true);
        console.log(evt_data);
        if(typeof(evt_data.node) === 'undefined' ||
            typeof(evt_data.instance) === 'undefined') return;

        // From https://stackoverflow.com/a/26783802/2877364 by
        // https://stackoverflow.com/users/305189/pierre-de-lespinay
        setTimeout(function() {
            evt_data.instance.show_contextmenu(evt_data.node);
                // because contextmenu.select_node is false, this will not
                // reselect the node.  If it did, it would trigger an
                // infinite loop.
        }, 100);
    } //hamOnSelect

    //////////////////////////////////////////////////////////////////////////
    // INIT //
    function initHamburger()
    {
        log.info('TabFern hamburger.js initializing view');
        let jstreeConfig = {
            'plugins': ['contextmenu', 'wholerow']
          , 'core': {
                'animation': false,
                'multiple': false,          // for now
                'check_callback': true,     // for now, allow modifications
                themes: {
                    'name': 'default-dark'
                  , 'variant': 'small'
                }
            }
          , 'contextmenu': {
                items: getMenuItems
              , select_node: false  // required for hamOnSelect to work
            }
        };

        // Create the tree
        $('#hamburger-menu').jstree(jstreeConfig);
        ham.treeobj = $('#hamburger-menu').jstree(true);

        // Add the single item
        ham.tree_node = ham.treeobj.create_node(null,
                {   text: ''
                    , 'icon': 'fa fa-bars'
                    , state: { 'opened': false }
                });

        $('#hamburger-menu').on('changed.jstree', hamOnSelect);
    }

    //////////////////////////////////////////////////////////////////////////
    // MAIN //

    window.addEventListener('load', initHamburger, { 'once': true });

})(window._tabFernHamburgerMenu);

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
