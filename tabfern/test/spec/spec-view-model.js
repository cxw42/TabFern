// spec/view-model.js: Test src/view/model.js.
// Note: specs must be run in order

describe('view/model', function() {
    let Modules={};     ///< loaded modules
    let M;              ///< Model: module under test
    let K;              ///< view/const
    let T;              ///< view/item_tree
    let D;              ///< view/item_details
    let $;              ///< jQuery

    // Setup /////////////////////////////////////////////////////////// {{{1

    beforeAll(R(['jquery','jstree','view/model', 'view/const',
                    'view/item_tree', 'view/item_details'],
            Modules,
            ()=>{
                M = Modules['view/model'];
                K = Modules['view/const'];
                T = Modules['view/item_tree'];
                D = Modules['view/item_details'];
                $ = Modules['jquery'];

                this.$div = $('<div />').appendTo('body');
                T.create(this.$div, true);
                    // true = check-callback => allow all
                    // no dnd or context menu

                // Create vars we will use below
                this.win_node_id = null;
                this.win_val = null;
                this.tab_node_id = null;
                this.tab_val = null;
            }
    ));

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

    // }}}1
    // Attaching to Chrome widgets ///////////////////////////////////// {{{1
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

    // }}}1
    // Detaching from Chrome widgets /////////////////////////////////// {{{1
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

    // }}}1
    // Removing items ////////////////////////////////////////////////// {{{1
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

    // }}}1
    // Index mapping /////////////////////////////////////////////////// {{{1
    describe('index mapping', ()=>{
        // Fixture setup ================================== {{{2

        beforeAll(()=>{
            // Make a fake window and tabs
            let vn = M.vnRezWin();
            this.win_val = vn.val;
            this.win_node_id = vn.node_id;
            this.tab_vns = [];
            this.NTABS=10;
            for(let i=0; i<this.NTABS; ++i) {
                this.tab_vns.push(M.vnRezTab(this.win_val));
            }
            T.treeobj.open_node(this.win_node_id);  // TODO do async?  Seems to be OK.
            let fake_cwin = {id: 1337};
            M.markWinAsOpen(this.win_val, fake_cwin);
            expect(this.win_val.isOpen).toBeTruthy();

            /// A helper function to open the specified tabs.
            /// @param which_tabs {Array}
            this.openSomeTabs = function openSomeTabs(which_tabs) {
                this.tab_vns.forEach( (vn, idx)=>{   // Open all the tabs
                    let should_open =
                            (!which_tabs || which_tabs.indexOf(idx)!==-1);
                    if(should_open) {
                        let fake_ctab = {id: idx+1,     // can't be 0
                            windowId: this.win_val.win_id,
                            index: idx,
                            url: `http://example.com/${idx}`,
                            title: `Fake tab ${idx}`,
                            // no favIconUrl; no pinned (=> not pinned)
                        };
                        M.markTabAsOpen(vn.val, fake_ctab);
                    }

                    since(`Tab(s) ${which_tabs ? which_tabs : "(all)"} are` +
                            ` open, so tab ${idx} should be ` +
                            (should_open ? 'open': ' closed'))
                    .expect(vn.val.isOpen).toBe(should_open);
                }); //foreach tab

            }; //openSomeTabs()

            this.closeAllTabs = function closeAllTabs() {
                this.tab_vns.forEach( (vn)=>{
                    M.markTabAsClosed(vn.val);
                });
            };

        });

        // }}}2
        // Fully-open window ============================== {{{2
        describe('fully-open window',()=>{
            beforeAll(()=>{this.openSomeTabs();});

            it('identity-maps tree indices to Chrome indices', ()=>{
                //debugger; void Modules; void T;

                this.tab_vns.forEach( (vn, idx)=>{
                    expect(M.chromeIdxOfTab(this.win_node_id, idx)).toBe(idx);
                });
            });

            it('identity-maps Chrome indices to tree indices', ()=>{
                this.tab_vns.forEach( (vn, idx)=>{
                    expect(M.treeIdxByChromeIdx(this.win_node_id, idx)).toBe(idx);
                });

            });
            afterAll(()=>{this.closeAllTabs();});
        });

        // }}}2
        // Single tabs ==================================== {{{2
        describe('first tab open',()=>{
            beforeAll(()=>{this.openSomeTabs([0]);});
            it('maps open tab->chrome',()=>{
                expect(M.chromeIdxOfTab(this.win_node_id, 0)).toBe(0);
            });
            it('maps open chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 0)).toBe(0);
            });
            it('maps new-tab chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 1)).toBe(1);
            });
            afterAll(()=>{this.closeAllTabs();});
        });

        describe('second tab open',()=>{
            beforeAll(()=>{this.openSomeTabs([1]);});
            it('maps open tab->chrome',()=>{
                expect(M.chromeIdxOfTab(this.win_node_id, 1)).toBe(0);
            });
            it('maps open chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 0)).toBe(1);
            });
            it('maps new-tab chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 1)).toBe(2);
            });
            afterAll(()=>{this.closeAllTabs();});
        });

        describe('next-to-last tab open',()=>{
            beforeAll(()=>{this.openSomeTabs([this.NTABS-2]);});
            it('maps open tab->chrome',()=>{
                expect(M.chromeIdxOfTab(this.win_node_id, this.NTABS-2)).toBe(0);
            });
            it('maps open chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 0)).toBe(this.NTABS-2);
            });
            it('maps new-tab chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 1)).toBe(this.NTABS-1);
            });
            afterAll(()=>{this.closeAllTabs();});
        });

        describe('last tab open',()=>{
            beforeAll(()=>{this.openSomeTabs([this.NTABS-1]);});
            it('maps open tab->chrome',()=>{
                expect(M.chromeIdxOfTab(this.win_node_id, this.NTABS-1)).toBe(0);
            });
            it('maps open chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 0)).toBe(this.NTABS-1);
            });
            it('maps new-tab chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 1)).toBe(this.NTABS);
            });
            afterAll(()=>{this.closeAllTabs();});
        });

        // }}}2
        // Pairs of tabs ================================== {{{2

        describe('tabs 0 and 1 open',()=>{
            beforeAll(()=>{this.openSomeTabs([0, 1]);});

            it('maps open tab->chrome',()=>{
                expect(M.chromeIdxOfTab(this.win_node_id, 0)).toBe(0);
                expect(M.chromeIdxOfTab(this.win_node_id, 1)).toBe(1);
            });
            it('maps open chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 0)).toBe(0);
                expect(M.treeIdxByChromeIdx(this.win_node_id, 1)).toBe(1);
            });
            it('maps new-tab chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 2)).toBe(2);
            });

            afterAll(()=>{this.closeAllTabs();});
        });

        describe('tabs 1 and 2 open',()=>{
            beforeAll(()=>{this.openSomeTabs([1, 2]);});

            // TODO throughout - failure cases - what about asking for the
            // Chrome index of a closed tab?
            it('maps open tab->chrome',()=>{
                expect(M.chromeIdxOfTab(this.win_node_id, 1)).toBe(0);
                expect(M.chromeIdxOfTab(this.win_node_id, 2)).toBe(1);
            });
            it('maps open chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 0)).toBe(1);
                expect(M.treeIdxByChromeIdx(this.win_node_id, 1)).toBe(2);
            });
            it('maps new-tab chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 2)).toBe(3);
            });

            afterAll(()=>{this.closeAllTabs();});
        });

        describe('next-to-last two tabs open',()=>{
            beforeAll(()=>{this.openSomeTabs([this.NTABS-3, this.NTABS-2]);});

            it('maps open tab->chrome',()=>{
                expect(M.chromeIdxOfTab(this.win_node_id, this.NTABS-3)).toBe(0);
                expect(M.chromeIdxOfTab(this.win_node_id, this.NTABS-2)).toBe(1);
            });
            it('maps open chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 0)).toBe(this.NTABS-3);
                expect(M.treeIdxByChromeIdx(this.win_node_id, 1)).toBe(this.NTABS-2);
            });
            it('maps new-tab chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 2)).toBe(this.NTABS-1);
            });

            afterAll(()=>{this.closeAllTabs();});
        });

        describe('last two tabs open',()=>{
            beforeAll(()=>{this.openSomeTabs([this.NTABS-2, this.NTABS-1]);});

            it('maps open tab->chrome',()=>{
                expect(M.chromeIdxOfTab(this.win_node_id, this.NTABS-2)).toBe(0);
                expect(M.chromeIdxOfTab(this.win_node_id, this.NTABS-1)).toBe(1);
            });
            it('maps open chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 0)).toBe(this.NTABS-2);
                expect(M.treeIdxByChromeIdx(this.win_node_id, 1)).toBe(this.NTABS-1);
            });
            it('maps new-tab chrome->tab',()=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, 2)).toBe(this.NTABS);
            });

            afterAll(()=>{this.closeAllTabs();});
        });

        // }}}2
        // All but one tab ================================ {{{2

        describe('all but tab 0 open',()=>{
            beforeAll(()=>{
                let arr = [];
                for(let i=0; i<this.NKIDS; ++i) {
                    if(i != 0) arr.push(i);
                }
                this.openSomeTabs(arr);
            });
            afterAll(()=>{this.closeAllTabs();});
        });

        describe('all but tab 1 open',()=>{
            beforeAll(()=>{
                let arr = [];
                for(let i=0; i<this.NKIDS; ++i) {
                    if(i != 1) arr.push(i);
                }
                this.openSomeTabs(arr);
            });
            afterAll(()=>{this.closeAllTabs();});
        });

        describe('all but next-to-last tab open',()=>{
            beforeAll(()=>{
                let arr = [];
                for(let i=0; i<this.NKIDS; ++i) {
                    if(i != this.NKIDS-2) arr.push(i);
                }
                this.openSomeTabs(arr);
            });
            afterAll(()=>{this.closeAllTabs();});
        });

        describe('all but last tab open',()=>{
            beforeAll(()=>{
                let arr = [];
                for(let i=0; i<this.NKIDS; ++i) {
                    if(i != this.NKIDS-1) arr.push(i);
                }
                this.openSomeTabs(arr);
            });
            afterAll(()=>{this.closeAllTabs();});
        });

        // }}}2
        // Fixture teardown =============================== {{{2
        afterAll(()=>{
            delete this.win_val;
            delete this.win_node_id;
            delete this.tab_vns;
            delete this.openSomeTabs;
            delete this.closeAllTabs;
        });
        // }}}2
    });

    // }}}1
    // Teardown //////////////////////////////////////////////////////// {{{1
    afterAll(()=>{
        this.$div.remove();
    });

    // }}}1

});
// vi: set ts=4 sts=4 sw=4 et ai fo-=ro foldmethod=marker: //
