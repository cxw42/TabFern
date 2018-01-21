// spec/view-model.js: Test src/view/model.js.

describe('view/model', function() {
    let Modules={};     ///< loaded modules
    let M;              ///< Model: module under test
    let K;              ///< view/const
    let T;              ///< view/tree
    let $;              ///< jQuery

    beforeAll(R(['jquery','jstree','view/model', 'view/const',
                    'view/item_tree'],
            Modules,
            ()=>{
                M = Modules['view/model'];
                K = Modules['view/const'];
                T = Modules['view/item_tree'];
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
    });

    it('can rez a new window item', ()=>{
        let vn = M.vnRezWin();
        expect(vn).not.toBeUndefined();
        expect(vn.val).toBeTruthy();
        expect(vn.node_id).toBeTruthy();

        // TODO test the contents of vn.val

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
    });

    it('can add a multitype to a window',()=>{
    });

    it('can add a multitype to a tab',()=>{
    });

    it('can remove a multitype from a window',()=>{
    });

    it('can remove a multitype from a tab',()=>{
    });

    it('can mark a window as open',()=>{
    });

    it('can mark a tab as open',()=>{
    });

    it('can mark a tab as closed',()=>{
    });

    it('can mark a window as closed',()=>{
    });

    it('can erase a tab item',()=>{
    });

    it('can erase a window item',()=>{
    });

    afterAll(()=>{
        //this.$div.remove();
    });

});
// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
