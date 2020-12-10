// spec/app-win-model.js: Test app/win/model.js.
// Note: specs must be run in order

describe('app/win/model', function() {
    let $;              ///< jQuery
    let K;              ///< win/const
    let T;              ///< win/item_tree
    let D;              ///< win/item_details
    let M;              ///< win/model: module under test

    // Helper routines ///////////////////////////////////////////////// {{{1

    /// makeWin: add a window to the model.
    /// @return {val, node_id}
    /// Also runs expect() checks on the new window.
    function makeWin() {
        let vn = M.vnRezWin();
        expect(vn).not.toBeUndefined();
        expect(vn.val).toBeTruthy();
        expect(vn.node_id).toBeTruthy();
        return vn;
    } //makeWin

    /// makeTab: add a tab to the model.
    /// @param win_val  The val for the window
    /// @return {val, node_id}
    /// Also runs expect() checks on the new tab.
    function makeTab(win_val) {
        let vn = M.vnRezTab(win_val);
        expect(vn).not.toBeUndefined();
        expect(vn.val).toBeTruthy();
        expect(vn.node_id).toBeTruthy();
        return vn;
    } //makeTab

    // }}}1
    // Setup /////////////////////////////////////////////////////////// {{{1

    beforeAll(()=>{
        $ = require('jquery');
        require('lib/jstree');
        K = require('win/const');
        T = require('win/item_tree');
        D = require('win/item_details');
        M = require('win/model');

        this.$div = $('<div />').appendTo('body');
        T.create(this.$div, {
            check_callback: true,   // allow all
            report_error: function(err) {   // NOT ()=>{} - this=jstree instance
                if(err && err.id && err.id === 'core_08') {
                    return;     // Nothing to do
                }
                expect(err).toBeUndefined();    // Cause a test failure
            },
            // No dnd or context menu.
        });

        // Create vars we will use below
        this.win_node_id = null;
        this.win_val = null;
        this.tab_node_id = null;
        this.tab_val = null;
    });

    it('can be loaded successfully', ()=>{
        expect(M).not.toBeUndefined();
        expect(K).not.toBeUndefined();
        expect(T).not.toBeUndefined();
        expect($).not.toBeUndefined();  // for grins
        expect(T.treeobj).not.toBeUndefined();

        expect(T.holding_node_id).toBeTruthy();
        let holding_pen = T.treeobj.get_node(T.holding_node_id);
        expect(holding_pen).toBeTruthy();
    });

    // }}}1
    // Creation and updating /////////////////////////////////////////// {{{1
    describe('creation and updating', ()=>{
        it('can rez a new window item', ()=>{
            let vn = M.vnRezWin();
            expect(vn).not.toBeUndefined();
            expect(vn.val).toBeTruthy();
            expect(vn.node_id).toBeTruthy();

            // TODO test the contents of vn.val
            expect(vn.val.node_id).toBe(vn.node_id);
            expect(vn.isOpen).toBeFalsy();

            // Pass data to the next test
            this.win_val = vn.val;
            this.win_node_id = vn.node_id;

        });

        it('can rez a new tab item', ()=>{
            let vn = M.vnRezTab(this.win_val);
            expect(vn).not.toBeUndefined();
            expect(vn.val).toBeTruthy();
            expect(vn.node_id).toBeTruthy();

            // TODO test the contents of vn.val

            // Pass data to the next test
            this.tab_val = vn.val;
            this.tab_node_id = vn.node_id;

            T.treeobj.open_node(this.win_node_id);
                // or else the tab won't be in the DOM yet, so the tests below will fail
        });

        it('can add a subtype to a window',()=>{
            let $node = $('#'+this.win_node_id).eq(0);
            expect($node.hasClass('tfs-saved')).toBe(false);
            expect(M.add_subtype(this.win_node_id, K.NST_SAVED)).toBe(true);
            since('the subtype should exist')
            .expect(M.has_subtype(this.win_node_id, K.IT_WIN, K.NST_SAVED)).toBe(true);
            since('the DOM node should have .tfs-saved')
            .expect($node.hasClass('tfs-saved')).toBe(true);
        });

        it('can add a subtype to a tab',()=>{
            let $node = $('#'+this.tab_node_id).eq(0);
            expect($node.hasClass('tfs-top-bordered')).toBe(false);
            expect(M.add_subtype(this.tab_node_id, K.NST_TOP_BORDER)).toBe(true);
            since('the subtype should exist')
            .expect(M.has_subtype(this.tab_node_id, K.IT_TAB, K.NST_TOP_BORDER)).toBe(true);
            since('the DOM node should have .tfs-top-bordered')
            .expect($node.hasClass('tfs-top-bordered')).toBe(true);
        });

        it('can remove a subtype from a window',()=>{
            let $node = $('#'+this.win_node_id).eq(0);
            expect($node.eq(0).hasClass('tfs-saved')).toBe(true);
            expect(M.del_subtype(this.win_node_id, K.NST_SAVED)).toBe(true);
            since('the subtype should be gone')
            .expect(M.has_subtype(this.win_node_id, K.NST_SAVED)).toBe(false);
            since('.tfs-saved should be gone')
            .expect($node.eq(0).hasClass('tfs-saved')).toBe(false);
        });

        it('can remove a subtype from a tab',()=>{
            let $node = $('#'+this.tab_node_id).eq(0);
            expect($node.hasClass('tfs-top-bordered')).toBe(true);
            expect(M.del_subtype(this.tab_node_id, K.NST_TOP_BORDER)).toBe(true);
            since('the subtype should be gone')
            .expect(M.has_subtype(this.tab_node_id, K.NST_TOP_BORDER)).toBe(false);
            since('.tfs-top-bordered should be gone')
            .expect($node.hasClass('tfs-top-bordered')).toBe(false);
        });

    });
    // }}}1
    // Attaching to Chrome widgets ///////////////////////////////////// {{{1
    describe('attaching to Chrome widgets', ()=>{
        it('can mark a window as open',(done)=>{    // Use the current window as a test case
            chrome.windows.getCurrent((cwin)=>{
                expect(chrome.runtime.lastError).toBeFalsy();
                if(chrome.runtime.lastError) { done(); return; }

                let $node = $('#'+this.win_node_id).eq(0);
                expect($node.hasClass('tfs-open')).toBe(false);

                expect(M.markWinAsOpen(this.win_node_id, cwin)).toBe(true);
                $node = $('#'+this.win_node_id).eq(0);
                    // jstree may have redrawn, so get the updated node

                expect($node.hasClass('tfs-open')).toBe(true);
                expect(this.win_val.win_id).toBe(cwin.id);
                expect(this.win_val.isOpen).toBe(true);
                expect($node.find('a').first().text()).toBe('Unsaved');

                done();
            });
        });

        it('can mark a tab as open',(done)=>{   // Use the current tab for convenience
            chrome.tabs.getCurrent((ctab)=>{
                expect(chrome.runtime.lastError).toBeFalsy();
                if(chrome.runtime.lastError) { done(); return; }

                let $node = $('#'+this.tab_node_id).eq(0);
                expect($node.hasClass('tfs-open')).toBe(false);

                expect(M.markTabAsOpen(this.tab_node_id, ctab)).toBe(true);
                $node = $('#'+this.tab_node_id).eq(0);
                    // jstree may have redrawn, so get the updated node

                expect($node.hasClass('tfs-open')).toBe(true);
                expect(this.tab_val.tab_id).toBe(ctab.id);
                expect(this.tab_val.isOpen).toBe(true);
                expect($node.find('a').first().text()).toMatch(/^Jasmine\b/);

                let parent_val = D.windows.by_win_id(ctab.windowId);
                expect(parent_val).toBeTruthy();
                done();
            });
        });

        // TODO test opening a second window with the same tab URL, and making sure
        // the first window keeps the corresponding ordered_url_hash.
    });

    // }}}1
    // Detaching from Chrome widgets /////////////////////////////////// {{{1
    describe('detaching from Chrome widgets', ()=>{
        it('can mark a tab as closed',()=>{
            let $node = $('#'+this.tab_node_id).eq(0);
            expect($node.hasClass('tfs-open')).toBe(true);
            expect(this.tab_val.isOpen).toBe(true);

            since('marking should succeed')
            .expect(M.markTabAsClosed(this.tab_node_id)).toBe(true);
            $node = $('#'+this.tab_node_id).eq(0);
                // jstree may have redrawn, so get the updated node

            since('.tfs-open should be gone').expect($node.hasClass('tfs-open')).toBe(false);
            expect(this.tab_val.isOpen).toBe(false);

            since('tab_id should be gone').expect(this.tab_val.tab_id).toBe(K.NONE);
            since('win_id should be gone').expect(this.tab_val.win_id).toBe(K.NONE);
            since('index should be gone').expect(this.tab_val.index).toBe(K.NONE);
            since('tab should be gone').expect(this.tab_val.tab).toBeFalsy();

            expect($node.find('a').first().text()).toMatch(/^Jasmine\b/);
        });

        it('can mark a window as closed',()=>{
            let $node = $('#'+this.win_node_id).eq(0);
            expect($node.hasClass('tfs-open')).toBe(true);
            expect(this.win_val.isOpen).toBe(true);

            since('marking should succeed')
            .expect(M.markWinAsClosed(this.win_node_id)).toBe(true);
            $node = $('#'+this.win_node_id).eq(0);
                // jstree may have redrawn, so get the updated node

            since('.tfs-open should be gone').expect($node.hasClass('tfs-open')).toBe(false);
            expect(this.win_val.isOpen).toBe(false);

            since('win_id should be gone').expect(this.win_val.win_id).toBe(K.NONE);
            since('win should be gone').expect(this.win_val.win).toBeFalsy();

            expect($node.find('a').first().text()).toBe('Unsaved');
        });

    });

    // }}}1
    // Removing items ////////////////////////////////////////////////// {{{1
    describe('removing items', ()=>{
        it('can erase a tab item',()=>{
            let $node = $('#'+this.tab_node_id);
            expect($node.length).toBe(1);

            since('erasing should succeed').expect(M.eraseTab(this.tab_node_id)).toBe(true);
            $node = $('#'+this.tab_node_id);

            since('the DOM node should be gone').expect($node.length).toBe(0);
            since('the details record should be gone')
            .expect(D.tabs.by_node_id(this.tab_node_id)).toBeFalsy();

            this.tab_val = undefined;       // So subsequent tests don't try to use them
            this.tab_node_id = undefined;
        });

        it('can erase a window item',()=>{
            let $node = $('#'+this.win_node_id);
            expect($node.length).toBe(1);

            since('erasing should succeed').expect(M.eraseWin(this.win_node_id)).toBe(true);
            $node = $('#'+this.win_node_id);

            since('the DOM node should be gone').expect($node.length).toBe(0);
            since('the details record should be gone')
            .expect(D.windows.by_node_id(this.win_node_id)).toBeFalsy();

            delete this.win_val;        // So subsequent tests don't try to use them
            delete this.win_node_id;
        });
    });

    // }}}1
    // Index mapping /////////////////////////////////////////////////// {{{1
    describe('index mapping', ()=>{

        // Jasmine setup {{{2

        beforeAll(()=>{     // Register a custom matcher to test truth value
            jasmine.addMatchers({
                toBeEqv: function(util, customEqualityTesters) {
                    return {
                        compare: function(actual, expected) {
                            let result = {};
                            result.pass = util.equals(!!actual, !!expected,
                                                        customEqualityTesters);
                            if(result.pass) {
                                // failure message with .not.
                                result.message = `Expected ${actual} to have a different truth value than ${expected}`;
                            } else {
                                // normal failure message
                                result.message = `Expected ${actual} to have the same truth value as ${expected}`;
                            }
                            return result;
                        } //compare()
                    }; //custom matcher object
                } //toBeEqv
            }); //addMatchers call
        }); //beforeAll call

        // }}}2
        // Helper functions {{{2
        let next_win_id = 100;
        let next_tab_id = 2000;

        /// Return whether a tab spec represents a tab that should be open.
        /// See makeFakeWindow() for details.
        function shouldBeOpen(tab_spec) {
            return /[A-Z]/.test(tab_spec);
        }

        /// makeFakeWindow: create a fake Chrome window.
        /// @param tabState {String}    Tab IDs, A-Z --- uppercase for open
        ///         tabs, lowercase for closed tabs.  Tab IDs are stored
        ///         lowercase in tab_val.raw_title.
        /// @return win_vn The vn for the window
        function makeFakeWindow(tabState) {

            // Make the window
            let win_vn = makeWin();
            M.markWinAsOpen(win_vn,
                {   // Fake cwin
                    id: next_win_id++,
                }
            );

            // Add the tabs
            let tab_index = 0;
            for(let tab_spec of tabState) {
                let tab_vn = makeTab(win_vn.val);   // tab starts out closed
                tab_vn.val.raw_title = tab_spec.toLowerCase();

                if(shouldBeOpen(tab_spec)) {
                    M.markTabAsOpen(tab_vn.val,
                        {   // Fake ctab
                            id: next_tab_id++,
                            windowId: win_vn.val.id,
                            index: tab_index++,
                            url: 'about:blank',
                            title: tab_vn.val.raw_title,
                            favIconUrl: 'about:blank',
                            // pinned can be omitted
                            // audible can be omitted
                        }
                    );
                } //endif should open
            } //foreach tab_spec

            return win_vn;
        } //makeFakeWindow()

        /// Make a fake tab
        /// @param win_vn   The window
        /// @return tab_vn
        function makeFakeTab(win_vn) {
            let vn = M.vnRezTab(win_vn);
            expect(vn).not.toBeUndefined();
            expect(vn.val).toBeTruthy();
            expect(vn.node_id).toBeTruthy();
            return vn;
        } //makeFakeTab()

        /// Make a fake ctab
        /// @param win_vn   The window
        /// @param cindex {Numeric}     The index in the cwin
        /// @param raw_title {String}   The new raw_title
        /// @return ctab {Object}
        function make_fake_ctab(win_vn, cindex, raw_title)
        {
            return {
                id: next_tab_id++,
                windowId: win_vn.val.win_id,
                index: cindex,
                url: 'about:blank',
                title: raw_title,
                favIconUrl: 'about:blank',
                // pinned can be omitted
                // audible can be omitted
            }
        } //make_fake_ctab()

        /// Add a fake tab to a window.
        /// NOTE: assumes tab isOpen values are correct.
        /// @param win_vn   The window
        /// @param raw_title    The raw_title for the new tab
        /// @param cindex   The Chrome index of the tab (omitted or -1 = end).
        /// @return tab_vn  The new tab
        function chromeAddsFakeTab(win_vn, raw_title, cindex = -1) {
            expect(win_vn).not.toBeUndefined();

            let tab_vn = makeTab(win_vn);
            expect(tab_vn).not.toBeUndefined();

            // Find the last Chrome index if necessary.
            if(cindex = -1) {
                cindex = 0;
                let win_node = T.treeobj.get_node(win_vn.node_id);
                expect(win_node).not.toBeUndefined();
                for(let tab_node_id of win_node.children) {
                    let tab_val = D.tabs.by_node_id(tab_node_id);
                    expect(tab_val).not.toBeUndefined();
                    if(tab_val.isOpen) {
                        ++cindex;
                    }
                } //foreach tab
            } //endif we need to compute cindex

            M.react_onTabCreated(win_vn, tab_vn,
                make_fake_ctab(win_vn, cindex, raw_title));
        } //chromeAddsFakeTab

        /// Close a fake window as if in response to a Chrome event.
        /// @param  win_vn  {val, node_id}  The window
        function closeFakeWindowAsIfChrome(win_vn) {
            let win_node = T.treeobj.get_node(win_vn.node_id);
            expect(win_node).not.toBeUndefined();

            for(tab_node_id of win_node.children) {
                expect(tab_node_id).toBeTruthy();

                let tab_val = D.tabs.by_node_id(tab_node_id);
                expect(tab_val).not.toBeUndefined();

                if(tab_val.isOpen) {
                    M.markTabAsClosed(tab_val);
                }
            }
            M.markWinAsClosed(win_vn.val);
        } //closeFakeWindowAsIfChrome

        /// Check whether the configuration of a window matches the given
        /// configuration.  \p tabState is as for makeFakeWindow.
        /// @param win_vn   The window
        /// @param expectedTabState {String}    as makeFakeWindow():tabState
        function expectWindowState(win_vn, expectedTabState) {
            let win_node = T.treeobj.get_node(win_vn.node_id);
            expect(win_node).not.toBeUndefined();

            let actualState = '';

            // Build up the actual state.  Assumes single-letter raw_titles.
            for(const tab_node_id of win_node.children) {
                const tab_val = D.tabs.by_node_id(tab_node_id);
                actualState +=
                    tab_val.isOpen ? tab_val.raw_title.toUpperCase() :
                    tab_val.raw_title.toLowerCase();
            } //foreach tab

            // Check it
            expect(actualState).toBe(expectedTabState);

            /*  // This is a more explicit way of testing the same thing.
                // Use this block for raw_title values outside the range [a-z].
            let ctab_index = 0;     // Chrome tab index
            expect(win_node.children.length).toEqual(expectedTabState.length);
            for(let idx=0; idx<expectedTabState.length; ++idx) {
                let expectedState = expectedTabState[idx];

                let tab_node_id = win_node.children[idx];
                expect(tab_node_id).toBeTruthy();

                let tab_val = D.tabs.by_node_id(tab_node_id);
                expect(tab_val).not.toBeUndefined();

                // Uppercase => open
                expect(tab_val.isOpen).toBeEqv(shouldBeOpen(expectedState));
                expect(tab_val.raw_title).toBe(expectedState.toLowerCase());

                // Check the tab's index based on whether the expected state
                // indicates this tab should be open.
                if(shouldBeOpen(expectedState)) {
                    expect(tab_val.index).toEqual(ctab_index++);
                } else {
                    expect(tab_val.index).toEqual(K.NONE);
                }

            } //foreach tab
            */
        } //expectWindowState

        // }}}2
        // Basic tests {{{2
        it('assigns sequential indices when one tab is present and open', ()=>{
            let win_vn = makeFakeWindow('A');
            expectWindowState(win_vn, 'A');
            expect(M.eraseWin(win_vn)).toBeTruthy();
        });

        it('has no index when one tab is present and closed', ()=>{
            let win_vn = makeFakeWindow('a');
            expectWindowState(win_vn, 'a');
            expect(M.eraseWin(win_vn)).toBeTruthy();
        });

        it('assigns sequential indices when all tabs are open', ()=>{
            let win_vn = makeFakeWindow('ABC');
            expectWindowState(win_vn, 'ABC');
            expect(M.eraseWin(win_vn)).toBeTruthy();
        });

        it('has no index when all tabs are closed', ()=>{
            let win_vn = makeFakeWindow('abc');
            expectWindowState(win_vn, 'abc');
            expect(M.eraseWin(win_vn)).toBeTruthy();
        });

        // }}}2

        //TODO react_onWinCreated
        //TODO react_onWinRemoved

        describe('onTabCreated',()=>{   // Chrome adds tabs {{{2

            // Each testcase is [description, fake-window tabs, ctab index,
            //                      new-tab raw_title, expected window state]
            const testcases = [
                ['updates the index when Chrome adds a tab to an empty window',
                    '', 0, 'd', 'D'],
                ['updates the index when Chrome adds a tab before the only tab',
                    'A', 0,'d', 'DA'],
                ['updates the index when Chrome adds a tab after the only tab',
                    'A', 1,'d', 'AD'],
                ['updates the index when Chrome adds a tab at the beginning (all open initially)',
                    'ABC', 0, 'd', 'DABC'],
                ['updates the index when Chrome adds a tab after the first beginning (all open initially)',
                    'ABC', 1, 'd', 'ADBC'],
                ['updates the index when Chrome adds a tab after the second (all open initially)',
                    'ABC', 2, 'd', 'ABDC'],
                ['updates the index when Chrome adds a tab at the end (all open initially)',
                    'ABC', 3, 'd', 'ABCD'],
                ['updates the index when Chrome adds a tab before a trailing closed tab',
                    'Ab', 1, 'd', 'ADb'],
            ];

            for(const thetest of testcases) {
                it(thetest[0], ()=>{
                    // Mock
                    let win_vn = makeFakeWindow(thetest[1]);
                    let ctab = make_fake_ctab(win_vn, thetest[2], thetest[3]);
                    let tab_vn = makeFakeTab(win_vn);

                    // Do the work
                    expect(M.react_onTabCreated(win_vn, tab_vn, ctab)).toBeTruthy();

                    // Check it
                    expectWindowState(win_vn, thetest[4]);
                    expect(M.eraseWin(win_vn)).toBeTruthy();
                });
            } //foreach testcase
        }); // }}}2

        describe('onTabMoved',()=>{   // Chrome moves tabs {{{2
            // Each testcase is [fake-window tabs,
            //                      which tab moves, ctab from,
            //                      ctab to, expected window state,
            //                      comments (if any)]
            const testcases = [
                ['AB', 'a', 0, 1, 'BA'],  // "->1" = A moves L to R by 1
                ['AB', 'b', 1, 0, 'BA'],
                ['ABC', 'b', 1, 0, 'BAC'],
                ['ABC', 'b', 1, 2, 'ACB'],
                ['AbCD', 'd', 2, 1, 'AbDC']
            ];

            for(const thetest of testcases) {

                // Convenient names for the pieces of the test
                const [faketabs, moving_tab, f, t, expected] = thetest;
                const comments = thetest[5] || '';
                const testname = `${faketabs}: ${moving_tab.toUpperCase()}` +
                    (f<t ? '->' : '<-') + Math.abs(f-t) +
                    (comments ? `: ${comments}` : '');

                it(testname, ()=>{
                    // Mock
                    let win_vn = makeFakeWindow(faketabs);

                    // Get the tab we are going to move
                    let tab_node_ids = T.treeobj.get_node(win_vn.node_id).children;
                    let tab_vn;
                    for(const tab_node_id of tab_node_ids) {
                        let tab_node = T.treeobj.get_node(tab_node_id);
                        if(moving_tab.toLowerCase() === tab_node.text.toLowerCase()) {
                            tab_vn = M.vn_by_vorny(tab_node_id);
                            break;
                        }
                    }
                    expect(tab_vn).toBeTruthy();

                    // Do the work
                    expect(
                        M.react_onTabMoved(win_vn, tab_vn, f, t)
                    ).toBeTruthy();

                    // Check it
                    expectWindowState(win_vn, expected);
                    expect(M.eraseWin(win_vn)).toBeTruthy();
                });
            } //foreach testcase
        }); // }}}2

        // TODO react_onTabRemoved()
        // TODO react_onTabDetached()
        // TODO react_onTabAttached()

    }); //index mapping

    // }}}1
    // Teardown //////////////////////////////////////////////////////// {{{1
    afterAll(()=>{
        this.$div.remove();
    });

    // }}}1

});
// vi: set ts=4 sts=4 sw=4 et ai fo-=ro foldmethod=marker: //
