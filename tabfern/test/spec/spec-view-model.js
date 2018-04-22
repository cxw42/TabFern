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

        beforeAll(()=>{
            // Make a fake window and tabs
            let vn = M.vnRezWin();
            this.win_val = vn.val;
            this.win_node_id = vn.node_id;
            this.tab_vns = [];
            for(let i=0; i<10; ++i) {
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
                    if(which_tabs && which_tabs.indexOf(idx)===-1) return;
                    let fake_ctab = {id: idx+1,     // can't be 0
                        windowId: this.win_val.win_id,
                        index: idx,
                        url: `http://example.com/${idx}`,
                        title: `Fake tab ${idx}`,
                        // no favIconUrl; no pinned (=> not pinned)
                    };
                    M.markTabAsOpen(vn.val, fake_ctab);
                });
            }; //openSomeTabs()

            this.closeAllTabs = function closeAllTabs() {
                this.tab_vns.forEach( (vn)=>{
                    M.markTabAsClosed(vn);
                });
            };

        });

        it('identity-maps tree indices to Chrome indices in a fully-open window', ()=>{
            this.openSomeTabs();    //open all
            debugger; void Modules; void T;

            this.tab_vns.forEach( (vn, idx)=>{
                expect(M.chromeIdxOfTab(this.win_node_id, idx)).toBe(idx);
            });
        });

        it('identity-maps Chrome indices to tree indices in a fully-open window', ()=>{
            this.tab_vns.forEach( (vn, idx)=>{
                expect(M.treeIdxByChromeIdx(this.win_node_id, idx)).toBe(idx);
            });

            this.closeAllTabs();
        });

        afterAll(()=>{
            delete this.win_val;
            delete this.win_node_id;
            delete this.tab_vns;
            delete this.openSomeTabs;
            delete this.closeAllTabs;
        });
    });

    // }}}1
    // Teardown //////////////////////////////////////////////////////// {{{1
    afterAll(()=>{
        this.$div.remove();
    });

    // }}}1

});
// vi: set ts=4 sts=4 sw=4 et ai fo-=ro foldmethod=marker: //
