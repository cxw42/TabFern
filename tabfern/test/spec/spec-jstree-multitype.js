// spec/spec-jstree-multitype.js: Test jstree-multitype plugin

describe('jstree-multitype', function() {
    let ASQ;
    let div;    // where the tree goes
    let treeobj;

    beforeAll(R(['jstree', 'jstree-multitype', 'asynquence',
                    'asynquence-contrib'],null,function(){
                        ASQ = RModules['asynquence-contrib'];
                    }));

    it('loads OK', function() {
        expect($.jstree.plugins.multitype).not.toBeUndefined();
        expect(ASQ).not.toBeUndefined();
    });

    it('can be created and load data', function(done) {
        div = $('<div />').appendTo('body');

        // Set up the test to complete once the load_node.jstree
        // event fires.
        ASQ.react( function(proceed){
                div.one('load_node.jstree',function(){proceed()});
        })
        .val(function(){done();});

            // Ref. https://stackoverflow.com/q/9114565/2877364
        expect(div).not.toBeUndefined();
        treeobj = div.jstree({plugins:['wholerow','multitype'],
            core:{
                check_callback: true,   //permit programmatic manipulation
                data:[
                    {text: 'root',
                        children: ['Child 1', 'Child 2']
                    }
                ],
                animation: false,
                multiple: false,
                themes: {
                    name: 'default-dark',
                    variant: 'small'
                },
            },
            multitype: {
            },
        }).jstree(true);
            // trailing .jstree(true) because the first .jstree
            // returns a jquery object
        expect(treeobj).not.toBeUndefined();

    });

    it('assigns an empty default multitype', function() {
        let root_node = treeobj.get_node($.jstree.root);
        expect(root_node).not.toBeFalsy();
        let child = root_node.children[0];
        expect(treeobj.get_node(child)).not.toBeFalsy();
        expect(treeobj.get_node(child).multitype).toEqual([]);
    });

    afterAll(function(){
        // Leave the tree around for now so we can see it
        //if(div) div.remove();
    });

});
// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
