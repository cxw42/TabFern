// spec/app-win-model.js: Test app/win/model.js.
// Note: specs must be run in order

describe("app/win/model", function () {
    let $; ///< jQuery
    let K; ///< win/const
    let T; ///< win/item_tree
    let D; ///< win/item_details
    let M; ///< win/model: module under test
    let log; ///< loglevel

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

    /// findTabInWindow: get a tab in a window created by makeFakeWindow()
    /// @param win_vorny        The window
    /// @param tab_raw_title    The raw_title of the tab sought.  It may be
    ///                         upper or lower case.
    /// @return the vn of the tab, or falsy on error.
    function findTabInWindow(win_vorny, tab_raw_title) {
        let winvn = M.vn_by_vorny(win_vorny);
        if (!winvn.node_id) return false;

        let tab_node_ids = T.treeobj.get_node(winvn.node_id).children;
        let retval = false;
        let needle = tab_raw_title.toLowerCase();

        for (const tab_node_id of tab_node_ids) {
            let tab_val = D.tabs.by_node_id(tab_node_id);
            if (needle === tab_val.raw_title) {
                retval = M.vn_by_vorny(tab_val);
                break;
            }
        }
        expect(retval).toBeTruthy();
        return retval;
    }

    // }}}1
    // Setup /////////////////////////////////////////////////////////// {{{1

    beforeAll(() => {
        $ = require("jquery");
        require("lib/jstree");
        K = require("win/const");
        T = require("win/item_tree");
        D = require("win/item_details");
        M = require("win/model");
        log = require("loglevel");

        this.$div = $("<div />").appendTo("body");
        T.create(this.$div, {
            check_callback: true, // allow all
            report_error: function (err) {
                // NOT ()=>{} - this=jstree instance
                if (err && err.id && err.id === "core_08") {
                    return; // Nothing to do
                }
                expect(err).toBeUndefined(); // Cause a test failure
            },
            // No dnd or context menu.
        });

        // Create vars we will use below
        this.win_node_id = null;
        this.win_val = null;
        this.tab_node_id = null;
        this.tab_val = null;
    });

    it("can be loaded successfully", () => {
        expect(M).not.toBeUndefined();
        expect(K).not.toBeUndefined();
        expect(T).not.toBeUndefined();
        expect($).not.toBeUndefined(); // for grins
        expect(T.treeobj).not.toBeUndefined();

        expect(T.holding_node_id).toBeTruthy();
        let holding_pen = T.treeobj.get_node(T.holding_node_id);
        expect(holding_pen).toBeTruthy();
    });

    // }}}1
    // Creation and updating /////////////////////////////////////////// {{{1
    describe("creation and updating", () => {
        it("can rez a new window item", () => {
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

        it("can rez a new tab item", () => {
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

        it("can add a subtype to a window", () => {
            let $node = $("#" + this.win_node_id).eq(0);
            expect($node.hasClass("tfs-saved")).toBe(false);
            expect(M.add_subtype(this.win_node_id, K.NST_SAVED)).toBe(true);
            since("the subtype should exist")
                .expect(M.has_subtype(this.win_node_id, K.IT_WIN, K.NST_SAVED))
                .toBe(true);
            since("the DOM node should have .tfs-saved")
                .expect($node.hasClass("tfs-saved"))
                .toBe(true);
        });

        it("can add a subtype to a tab", () => {
            let $node = $("#" + this.tab_node_id).eq(0);
            expect($node.hasClass("tfs-top-bordered")).toBe(false);
            expect(M.add_subtype(this.tab_node_id, K.NST_TOP_BORDER)).toBe(
                true
            );
            since("the subtype should exist")
                .expect(
                    M.has_subtype(this.tab_node_id, K.IT_TAB, K.NST_TOP_BORDER)
                )
                .toBe(true);
            since("the DOM node should have .tfs-top-bordered")
                .expect($node.hasClass("tfs-top-bordered"))
                .toBe(true);
        });

        it("can remove a subtype from a window", () => {
            let $node = $("#" + this.win_node_id).eq(0);
            expect($node.eq(0).hasClass("tfs-saved")).toBe(true);
            expect(M.del_subtype(this.win_node_id, K.NST_SAVED)).toBe(true);
            since("the subtype should be gone")
                .expect(M.has_subtype(this.win_node_id, K.NST_SAVED))
                .toBe(false);
            since(".tfs-saved should be gone")
                .expect($node.eq(0).hasClass("tfs-saved"))
                .toBe(false);
        });

        it("can remove a subtype from a tab", () => {
            let $node = $("#" + this.tab_node_id).eq(0);
            expect($node.hasClass("tfs-top-bordered")).toBe(true);
            expect(M.del_subtype(this.tab_node_id, K.NST_TOP_BORDER)).toBe(
                true
            );
            since("the subtype should be gone")
                .expect(M.has_subtype(this.tab_node_id, K.NST_TOP_BORDER))
                .toBe(false);
            since(".tfs-top-bordered should be gone")
                .expect($node.hasClass("tfs-top-bordered"))
                .toBe(false);
        });
    });
    // }}}1
    // Attaching to Chrome widgets ///////////////////////////////////// {{{1
    describe("attaching to Chrome widgets", () => {
        it("can mark a window as open", (done) => {
            // Use the current window as a test case
            chrome.windows.getCurrent((cwin) => {
                expect(chrome.runtime.lastError).toBeFalsy();
                if (chrome.runtime.lastError) {
                    done();
                    return;
                }

                let $node = $("#" + this.win_node_id).eq(0);
                expect($node.hasClass("tfs-open")).toBe(false);

                expect(M.markWinAsOpen(this.win_node_id, cwin)).toBe(true);
                $node = $("#" + this.win_node_id).eq(0);
                // jstree may have redrawn, so get the updated node

                expect($node.hasClass("tfs-open")).toBe(true);
                expect(this.win_val.win_id).toBe(cwin.id);
                expect(this.win_val.isOpen).toBe(true);
                expect($node.find("a").first().text()).toBe("Unsaved");

                done();
            });
        });

        it("can mark a tab as open", (done) => {
            // Use the current tab for convenience
            chrome.tabs.getCurrent((ctab) => {
                expect(chrome.runtime.lastError).toBeFalsy();
                if (chrome.runtime.lastError) {
                    done();
                    return;
                }

                let $node = $("#" + this.tab_node_id).eq(0);
                expect($node.hasClass("tfs-open")).toBe(false);

                expect(M.markTabAsOpen(this.tab_node_id, ctab)).toBe(true);
                $node = $("#" + this.tab_node_id).eq(0);
                // jstree may have redrawn, so get the updated node

                expect($node.hasClass("tfs-open")).toBe(true);
                expect(this.tab_val.tab_id).toBe(ctab.id);
                expect(this.tab_val.isOpen).toBe(true);
                expect($node.find("a").first().text()).toMatch(/^Tests\b/);

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
    describe("detaching from Chrome widgets", () => {
        it("can mark a tab as closed", () => {
            let $node = $("#" + this.tab_node_id).eq(0);
            expect($node.hasClass("tfs-open")).toBe(true);
            expect(this.tab_val.isOpen).toBe(true);

            since("marking should succeed")
                .expect(M.markTabAsClosed(this.tab_node_id))
                .toBe(true);
            $node = $("#" + this.tab_node_id).eq(0);
            // jstree may have redrawn, so get the updated node

            since(".tfs-open should be gone")
                .expect($node.hasClass("tfs-open"))
                .toBe(false);
            expect(this.tab_val.isOpen).toBe(false);

            since("tab_id should be gone")
                .expect(this.tab_val.tab_id)
                .toBe(K.NONE);
            since("win_id should be gone")
                .expect(this.tab_val.win_id)
                .toBe(K.NONE);
            since("index should be gone")
                .expect(this.tab_val.index)
                .toBe(K.NONE);
            since("tab should be gone").expect(this.tab_val.tab).toBeFalsy();

            expect($node.find("a").first().text()).toMatch(/^Tests\b/);
        });

        it("can mark a window as closed", () => {
            let $node = $("#" + this.win_node_id).eq(0);
            expect($node.hasClass("tfs-open")).toBe(true);
            expect(this.win_val.isOpen).toBe(true);

            since("marking should succeed")
                .expect(M.markWinAsClosed(this.win_node_id))
                .toBe(true);
            $node = $("#" + this.win_node_id).eq(0);
            // jstree may have redrawn, so get the updated node

            since(".tfs-open should be gone")
                .expect($node.hasClass("tfs-open"))
                .toBe(false);
            expect(this.win_val.isOpen).toBe(false);

            since("win_id should be gone")
                .expect(this.win_val.win_id)
                .toBe(K.NONE);
            since("win should be gone").expect(this.win_val.win).toBeFalsy();

            expect($node.find("a").first().text()).toBe("Unsaved");
        });
    });

    // }}}1
    // Removing items ////////////////////////////////////////////////// {{{1
    describe("removing items", () => {
        it("can erase a tab item", () => {
            let $node = $("#" + this.tab_node_id);
            expect($node.length).toBe(1);

            since("erasing should succeed")
                .expect(M.eraseTab(this.tab_node_id))
                .toBe(true);
            $node = $("#" + this.tab_node_id);

            since("the DOM node should be gone").expect($node.length).toBe(0);
            since("the details record should be gone")
                .expect(D.tabs.by_node_id(this.tab_node_id))
                .toBeFalsy();

            this.tab_val = undefined; // So subsequent tests don't try to use them
            this.tab_node_id = undefined;
        });

        it("can erase a window item", () => {
            let $node = $("#" + this.win_node_id);
            expect($node.length).toBe(1);

            since("erasing should succeed")
                .expect(M.eraseWin(this.win_node_id))
                .toBe(true);
            $node = $("#" + this.win_node_id);

            since("the DOM node should be gone").expect($node.length).toBe(0);
            since("the details record should be gone")
                .expect(D.windows.by_node_id(this.win_node_id))
                .toBeFalsy();

            delete this.win_val; // So subsequent tests don't try to use them
            delete this.win_node_id;
        });
    });

    // }}}1
    // M.react_*(), and index mapping ////////////////////////////////// {{{1
    describe("reacting to Chrome events", () => {
        // Jasmine setup {{{2

        /*
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
        */

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
            expect(win_vn).not.toBeUndefined();
            expect(win_vn.val).toBeTruthy();
            expect(win_vn.node_id).toBeTruthy();

            M.markWinAsOpen(win_vn, {
                // Fake cwin
                id: next_win_id++,
            });

            // Add the tabs
            let tab_index = 0;
            for (let tab_spec of tabState) {
                let tab_vn = makeTab(win_vn.val); // tab starts out closed
                tab_vn.val.raw_title = tab_spec.toLowerCase();

                if (shouldBeOpen(tab_spec)) {
                    M.markTabAsOpen(tab_vn.val, {
                        // Fake ctab
                        id: next_tab_id++,
                        windowId: win_vn.val.win_id,
                        index: tab_index++,
                        url: "about:blank",
                        title: tab_vn.val.raw_title,
                        favIconUrl: "about:blank",
                        // pinned can be omitted
                        // audible can be omitted
                    });
                } //endif should open
            } //foreach tab_spec

            return win_vn;
        } //makeFakeWindow()

        /// Make a fake tab in the model.  Does not connect to a ctab.
        /// @param win_vn   The window
        /// @return tab_vn
        function makeFakeTab(win_vn) {
            let vn = M.vnRezTab(win_vn);
            expect(vn).not.toBeUndefined();
            expect(vn.val).toBeTruthy();
            expect(vn.node_id).toBeTruthy();
            return vn;
        } //makeFakeTab()

        /// Make a fake ctab.  Does not add the ctab to anything.
        /// @param win_vn   The window
        /// @param cindex {Numeric}     The index in the cwin
        /// @param raw_title {String}   The new raw_title
        /// @return ctab {Object}
        function makeFakeCtab(win_vn, cindex, raw_title) {
            return {
                id: next_tab_id++,
                windowId: win_vn.val.win_id,
                index: cindex,
                url: "about:blank",
                title: raw_title,
                favIconUrl: "about:blank",
                // pinned can be omitted
                // audible can be omitted
            };
        } //makeFakeCtab()

        /// Add a fake tab to a window, as if Chrome had done so.
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
            if ((cindex = -1)) {
                cindex = 0;
                let win_node = T.treeobj.get_node(win_vn.node_id);
                expect(win_node).not.toBeUndefined();
                for (let tab_node_id of win_node.children) {
                    let tab_val = D.tabs.by_node_id(tab_node_id);
                    expect(tab_val).not.toBeUndefined();
                    if (tab_val.isOpen) {
                        ++cindex;
                    }
                } //foreach tab
            } //endif we need to compute cindex

            M.react_onTabCreated(
                win_vn,
                tab_vn,
                makeFakeCtab(win_vn, cindex, raw_title)
            );
        } //chromeAddsFakeTab

        /// Close a fake window as if in response to a Chrome event.
        /// @param  win_vn  {val, node_id}  The window
        function closeFakeWindowAsIfChrome(win_vn) {
            let win_node = T.treeobj.get_node(win_vn.node_id);
            expect(win_node).not.toBeUndefined();

            for (tab_node_id of win_node.children) {
                expect(tab_node_id).toBeTruthy();

                let tab_val = D.tabs.by_node_id(tab_node_id);
                expect(tab_val).not.toBeUndefined();

                if (tab_val.isOpen) {
                    M.markTabAsClosed(tab_val);
                }
            }
            M.markWinAsClosed(win_vn.val);
        } //closeFakeWindowAsIfChrome

        /// Check whether the configuration of a window in the model matches
        /// the given configuration.  \p tabState is as for makeFakeWindow.
        /// @param win_vn   The window
        /// @param expectedTabState {String}    as makeFakeWindow():tabState
        function expectWindowState(win_vn, expectedTabState) {
            let win_node = T.treeobj.get_node(win_vn.node_id);
            expect(win_node).not.toBeUndefined();

            let actualState = "";

            // Build up the actual state.  Assumes single-letter raw_titles.
            for (const tab_node_id of win_node.children) {
                const tab_val = D.tabs.by_node_id(tab_node_id);
                actualState += tab_val.isOpen
                    ? tab_val.raw_title.toUpperCase()
                    : tab_val.raw_title.toLowerCase();
            } //foreach tab

            expect(actualState).toBe(expectedTabState);
        } //expectWindowState

        // }}}2
        // Basic tests {{{2
        it("records one tab present and open", () => {
            let win_vn = makeFakeWindow("A");
            expectWindowState(win_vn, "A");
            expect(M.eraseWin(win_vn)).toBeTruthy();
        });

        it("records one tab is present and closed", () => {
            let win_vn = makeFakeWindow("a");
            expectWindowState(win_vn, "a");
            expect(M.eraseWin(win_vn)).toBeTruthy();
        });

        it("records three tabs, all open", () => {
            let win_vn = makeFakeWindow("ABC");
            expectWindowState(win_vn, "ABC");
            expect(M.eraseWin(win_vn)).toBeTruthy();
        });

        it("records three tabs, all closed", () => {
            let win_vn = makeFakeWindow("abc");
            expectWindowState(win_vn, "abc");
            expect(M.eraseWin(win_vn)).toBeTruthy();
        });

        it("records a mix of open and closed tabs", () => {
            let win_vn = makeFakeWindow("AbCdEf");
            expectWindowState(win_vn, "AbCdEf");
            expect(M.eraseWin(win_vn)).toBeTruthy();
        });

        // }}}2

        //TODO react_onWinCreated
        //TODO react_onWinRemoved

        describe("onTabCreated updates the index when Chrome adds a tab", () => {
            // {{{2

            // Each testcase is [description, fake-window tabs, ctab index,
            //                      new-tab raw_title, expected window state]
            const testcases = [
                ["to an empty window", "", 0, "d", "D"],
                ["before the only tab", "A", 0, "d", "DA"],
                ["after the only tab", "A", 1, "d", "AD"],
                [
                    "at the beginning (all open initially)",
                    "ABC",
                    0,
                    "d",
                    "DABC",
                ],
                [
                    "after the first beginning (all open initially)",
                    "ABC",
                    1,
                    "d",
                    "ADBC",
                ],
                [
                    "after the second (all open initially)",
                    "ABC",
                    2,
                    "d",
                    "ABDC",
                ],
                ["at the end (all open initially)", "ABC", 3, "d", "ABCD"],
                ["before a trailing closed tab", "Ab", 1, "d", "ADb"],
                ["after a leading closed tab", "xA", 0, "b", "xBA"],
                [
                    "between a leading (closed, open), before a trailing closed tab",
                    "xAy",
                    0,
                    "b",
                    "xBAy",
                ],
                [
                    "after a leading (closed, open), before a trailing closed tab",
                    "xAy",
                    1,
                    "b",
                    "xABy",
                ],
            ];

            for (const thetest of testcases) {
                it(thetest[0], () => {
                    // Mock
                    let win_vn = makeFakeWindow(thetest[1]);
                    let ctab = makeFakeCtab(win_vn, thetest[2], thetest[3]);

                    // Do the work
                    expect(M.react_onTabCreated(win_vn, ctab)).toBeTruthy();

                    // Check it
                    expectWindowState(win_vn, thetest[4]);
                    expect(M.eraseWin(win_vn)).toBeTruthy();
                });
            } //foreach testcase
        }); // }}}2

        // TODO add tests with opener tab ID --- put the new tab just after the
        // opener tab ID, if possible.

        describe("onTabUpdated", () => {
            // {{{2
            // Maps from fields that change to the resulting fields in tabval
            // that should change.  This does not provide an exhaustive test,
            // but is better than nothing.

            const fields_to_test = {
                changeinfo: {
                    url: "raw_url",
                    pinned: "isPinned",
                    audible: "isAudible",
                    title: "raw_title",
                    favIconUrl: "raw_favicon_url",
                },
                newctab: {
                    url: "raw_url",
                    pendingUrl: "raw_url",
                    pinned: "isPinned",
                    audible: "isAudible",
                    title: "raw_title",
                    favIconUrl: "raw_favicon_url",
                },
            };

            // Mock
            let winvn, tabvn;

            beforeEach(() => {
                winvn = makeFakeWindow("A");
                tabvn = findTabInWindow(winvn, "a");
            });
            afterEach(() => {
                expect(M.eraseWin(winvn)).toBeTruthy();
            });

            for (const structname in fields_to_test) {
                const fields = fields_to_test[structname];

                for (const fieldname in fields) {
                    const valfieldname = fields[fieldname];
                    it(`modifies val.${valfieldname} based on ${structname}.${fieldname}`, () => {
                        const oldval = tabvn.val[valfieldname];
                        const newval =
                            fieldname === "title"
                                ? "b"
                                : "not the same as " + JSON.stringify(oldval);
                        // Shamelessly abuse weak typing :)

                        // Do the work
                        let obj = { changeinfo: {}, newctab: {} };
                        obj[structname][fieldname] = newval;

                        const retval = M.react_onTabUpdated(
                            tabvn.val.tab_id,
                            obj.changeinfo,
                            obj.newctab
                        );
                        expect(typeof retval).toBe("object");
                        expect(retval).toBeTruthy();
                        expect("dirty" in retval).toBeTruthy();

                        // Check it
                        expectWindowState(
                            winvn,
                            fieldname === "title" ? "B" : "A"
                        );
                        expect(tabvn.val[valfieldname]).toBe(newval);
                        // TODO also check the tree node
                    });
                } //foreach fieldname
            } //foreach structname
        }); // }}}2
        describe("onTabMoved", () => {
            // Chrome moves tabs {{{2
            // Each testcase is [fake-window tabs,
            //                      which tab moves, ctab index from,
            //                      ctab index to, expected window state,
            //                      comments (if any)]
            // This array of testcases describes how tab movement works in
            // both fully-open and partly-open windows.  It represents
            // the design decisions for this behaviour.
            const testcases = [
                ["AB", "a", 0, 1, "BA"], // "->1" = A moves L to R by 1
                ["AB", "b", 1, 0, "BA"],
                ["ABC", "a", 0, 2, "BCA"],
                ["ABC", "b", 1, 0, "BAC"],
                ["ABC", "b", 1, 2, "ACB"],
                ["ABC", "c", 2, 0, "CAB"],
                ["AbCD", "d", 2, 1, "AbDC"],

                // A sequence of moves around a gap
                ["AbcDE", "e", 2, 1, "AbcED"],
                ["AbcED", "e", 1, 0, "EAbcD"],
                ["EAbcD", "e", 0, 1, "AEbcD"],
                ["AEbcD", "e", 1, 2, "AbcDE"],

                // A sequence of moves around a gap, with a leading gap as well
                ["xAbcDE", "e", 2, 1, "xAbcED"],
                ["xAbcED", "e", 1, 0, "xEAbcD"],
                ["xEAbcD", "e", 0, 1, "xAEbcD"],
                ["xAEbcD", "e", 1, 2, "xAbcDE"],

                // A sequence of moves around a gap, with a trailing gap as well
                ["AbcDEx", "e", 2, 1, "AbcEDx"],
                ["AbcEDx", "e", 1, 0, "EAbcDx"],
                ["EAbcDx", "e", 0, 1, "AEbcDx"],
                ["AEbcDx", "e", 1, 2, "AbcDEx"],

                // A sequence of moves around a gap; leading and trailing gaps
                ["xAbcDEx", "e", 2, 1, "xAbcEDx"],
                ["xAbcEDx", "e", 1, 0, "xEAbcDx"],
                ["xEAbcDx", "e", 0, 1, "xAEbcDx"],
                ["xAEbcDx", "e", 1, 2, "xAbcDEx"],

                ["AbcdeFG", "g", 2, 1, "AbcdeGF"],
                ["xAbcdeFG", "g", 2, 1, "xAbcdeGF"],
                ["AbcdeFGx", "g", 2, 1, "AbcdeGFx"],
                ["xAbcdeFGx", "g", 2, 1, "xAbcdeGFx"],

                // A sequence of moves around two gaps
                ["AbcDEfgH", "e", 2, 1, "AbcEDfgH"],
                ["AbcEDfgH", "h", 3, 2, "AbcEHDfg"],
                ["AbcEHDfg", "a", 0, 3, "bcEHDAfg"],
                ["bcEHDAfg", "e", 0, 3, "bcHDAEfg"],
            ];

            for (const testidx in testcases) {
                const thetest = testcases[testidx];

                // Convenient names for the pieces of the test
                const [faketabs, moving_tab, fromidx, toidx, expected] =
                    thetest;
                const comments = thetest[5] || "";
                const testname =
                    `[${testidx}] ${faketabs}: ${moving_tab.toUpperCase()}` +
                    (fromidx < toidx ? "->" : "<-") +
                    Math.abs(fromidx - toidx) +
                    (comments ? `: ${comments}` : "");

                it(testname, () => {
                    // Mock
                    let win_vn = makeFakeWindow(faketabs);
                    let tab_vn = findTabInWindow(win_vn, moving_tab);

                    // Do the work
                    const didmove = M.react_onTabMoved(
                        win_vn.val.win_id,
                        tab_vn.val.tab_id,
                        fromidx,
                        toidx
                    );
                    log.debug({ testname: didmove, testidx }); // bring those into scope
                    expect(didmove).toBe(true);

                    // Check it
                    expectWindowState(win_vn, expected);
                    expect(M.eraseWin(win_vn)).toBeTruthy();
                });
            } //foreach testcase
        }); // }}}2

        /// Testcases for onTabRemoved and onTabDetached.  They are the same
        /// because those functions have the same effect on the window
        /// the tab is in.  Each testcase is:
        /// [original window state, tab removed, final window state]
        const testcasesForRemoveOrDetach = [
            ["A", "a", ""],
            ["AB", "b", "A"],
            ["AB", "a", "B"],
            ["xAB", "a", "xB"],
            ["ABx", "a", "Bx"],
            ["xAB", "b", "xA"],
            ["ABx", "b", "Ax"],
            ["xABy", "a", "xBy"],
            ["wABx", "a", "wBx"],
            ["xABy", "b", "xAy"],
            ["wABx", "b", "wAx"],
            ["aBcDe", "b", "acDe"],
            ["aBcDe", "d", "aBce"],
        ];

        describe("onTabRemoved", () => {
            // {{{2

            for (const thetest of testcasesForRemoveOrDetach) {
                let testname = `${thetest[0]} - ${thetest[1]} => ${
                    thetest[2] || "(no tabs)"
                }`;
                it(testname, () => {
                    // Mock
                    let winvn = makeFakeWindow(thetest[0]);
                    let tabvn = findTabInWindow(winvn, thetest[1]);
                    const tab_node_id = tabvn.node_id;

                    // Do the work
                    const ok = M.react_onTabRemoved(
                        tabvn.val.tab_id,
                        winvn.val.win_id
                    );
                    expect(ok).toBe(true);

                    // Check it
                    expect(D.tabs.by_node_id(tab_node_id)).toBeFalsy();
                    expect(T.treeobj.get_node(tab_node_id)).toBeFalsy();
                    expectWindowState(winvn, thetest[2]);

                    expect(M.eraseWin(winvn)).toBeTruthy();
                });
            } //foreach testcase

            // Additional test for onTabRemoved: check that it properly
            // ignores already-deleted tabs.
            it("ignores already-deleted tabs", () => {
                // Mock
                let winvn = makeFakeWindow("ABC");
                let tabvn = findTabInWindow(winvn, "b");
                const tab_node_id = tabvn.node_id;
                const ctabid = tabvn.val.tab_id;

                // Disconnect the tab.  This is copied from
                // main_tl:move_open_tab_in_window().
                D.tabs.change_key(tabvn.val, "tab_id", K.NONE);
                tabvn.tab = undefined;
                tabvn.win_id = K.NONE;
                tabvn.index = K.NONE;
                tabvn.isOpen = false;

                // Do the work
                const ok = M.react_onTabRemoved(ctabid, winvn.val.win_id);
                expect(ok).toBe(true);

                // Check it
                expect(D.tabs.by_tab_id(ctabid)).toBeFalsy();
                expect(T.treeobj.get_node(tab_node_id)).toBeTruthy();
                expectWindowState(winvn, "ABC"); // because we haven't actually moved it

                expect(M.eraseWin(winvn)).toBeTruthy();
            });
        }); // }}}2

        describe("onTabDetached", () => {
            // {{{2
            for (const thetest of testcasesForRemoveOrDetach) {
                let testname = `${thetest[0]} - ${thetest[1]} => ${
                    thetest[2] || "(no tabs)"
                }`;
                it(testname, () => {
                    // Mock
                    let winvn = makeFakeWindow(thetest[0]);
                    let tabvn = findTabInWindow(winvn, thetest[1]);
                    const tab_node_id = tabvn.node_id;

                    // Do the work
                    const ok = M.react_onTabDetached(
                        tabvn.val.tab_id,
                        winvn.val.win_id
                    );
                    expect(ok).toBe(true);

                    // Check it
                    expect(tabvn.val.win_id).toBe(K.NONE);
                    expect(tabvn.val.index).toBe(K.NONE);
                    const tab_node = T.treeobj.get_node(tab_node_id);
                    expect(tab_node).toBeTruthy();
                    expect(tab_node.parent).toBe(T.holding_node_id);
                    expectWindowState(winvn, thetest[2]);
                    expect(M.eraseWin(winvn)).toBeTruthy();
                });
            } //foreach testcase
        }); // }}}2

        describe("onTabAttached", () => {
            // {{{2
            // Each testcase:
            // [original window state, new tab, new index, final window state]
            let testcases = [
                ["", "a", 0, "A"],

                // I had the following test, but I can't think of any way Chrome
                // would attach to a window with all closed tabs.  The window has
                // to be open before it can be attached to!
                //['a', 'b', 0, 'Ba'],    // OK?  Arguably inconsistent with xA+b@0->xBA.

                ["A", "b", 1, "AB"],
                ["A", "b", 0, "BA"],
                ["xA", "b", 1, "xAB"],
                ["xA", "b", 0, "xBA"],
                ["Ax", "b", 1, "ABx"],
                ["Ax", "b", 0, "BAx"],
                ["xAy", "b", 1, "xABy"],
                ["xAy", "b", 0, "xBAy"],
                ["xAyBz", "c", 0, "xCAyBz"],
                ["xAyBz", "c", 1, "xACyBz"],
                ["xAyBz", "c", 2, "xAyBCz"],
            ];

            for (const thetest of testcases) {
                let testname = `${thetest[0]} + ${thetest[1]}@${thetest[2]} => ${thetest[3]}`;
                it(testname, () => {
                    // Mock
                    let winvn = makeFakeWindow(thetest[0]);
                    let ctab = makeFakeCtab(winvn, thetest[2], thetest[1]);

                    // Attach it to a window
                    let tabvn = M.vnRezTab(winvn);
                    expect(tabvn.val).toBeTruthy();
                    const tab_node_id = tabvn.node_id;
                    expect(M.markTabAsOpen(tabvn, ctab)).toBeTruthy();

                    // Detach it by hand.  Excerpted from app/win/main_tl:tabOnDetached().
                    T.treeobj.because(
                        "chrome",
                        "move_node",
                        tabvn.node_id,
                        T.holding_node_id
                    );
                    tabvn.val.win_id = K.NONE;
                    tabvn.val.index = K.NONE;
                    M.updateTabIndexValues(winvn.node_id);

                    // Do the work
                    const ok = M.react_onTabAttached(
                        ctab.id,
                        winvn.val.win_id,
                        ctab.index
                    );
                    expect(ok).toBe(true);

                    // Check it
                    expect(tabvn.val.win_id).toBe(winvn.val.win_id);
                    expect(tabvn.val.index).toBe(ctab.index);

                    const tab_node = T.treeobj.get_node(tab_node_id);
                    expect(tab_node).toBeTruthy();
                    expect(tab_node.parent).not.toBe(T.holding_node_id);

                    expectWindowState(winvn, thetest[3]);

                    expect(M.eraseWin(winvn)).toBeTruthy();
                });
            } //foreach testcase
        }); // }}}2

        describe("onTabReplaced", () => {
            // {{{2
            // Each testcase:
            // [window state, tab that is being replaced]
            let testcases = [
                ["A", "a"],
                ["AB", "b"],
                ["xAB", "a"],
                ["xAB", "b"],
                ["ABx", "a"],
                ["ABx", "b"],
                ["xABy", "a"],
                ["xABy", "b"],
                ["aBcDe", "b"],
                ["aBcDe", "d"],
            ];

            for (const thetest of testcases) {
                let testname = `${thetest[0]}: replace ${thetest[1]}`;
                it(testname, () => {
                    // Mock
                    let winvn = makeFakeWindow(thetest[0]);
                    let tabvn = findTabInWindow(winvn, thetest[1]);
                    const oldidx = tabvn.val.index;
                    const newctabid = 31337;

                    // Do the work
                    const ok = M.react_onTabReplaced(
                        newctabid,
                        tabvn.val.tab_id
                    );
                    expect(ok).toBe(true);

                    // Check it
                    expect(tabvn.val.win_id).toBe(winvn.val.win_id);
                    expect(tabvn.val.tab_id).toBe(newctabid);
                    expect(tabvn.val.index).toBe(oldidx);
                    expectWindowState(winvn, thetest[0]);

                    expect(M.eraseWin(winvn)).toBeTruthy();
                });
            } //foreach testcase
        }); // }}}2
    }); //reacting to Chrome events }}}1

    // Teardown //////////////////////////////////////////////////////// {{{1
    afterAll(() => {
        this.$div.remove();
    });

    // }}}1
});
// vi: set ts=4 sts=4 sw=4 et ai fo-=ro foldmethod=marker: //
