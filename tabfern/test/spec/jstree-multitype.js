// spec/jstree-multitype.js: Test jstree-multitype plugin

describe('jstree-multitype', function() {
    let div;    // where the tree goes
    let treeobj;

    beforeAll(R(['jstree', 'jstree-multitype']));

    it('loads OK', function() {
        expect($.jstree.plugins.multitype).not.toBeUndefined();
    });

    it('can be created', function() {
        div = $('<div />').appendTo('body');
            // Ref. https://stackoverflow.com/q/9114565/2877364
        expect(div).not.toBeUndefined();
        let treeobj = div.jstree({plugins:['wholerow','multitype'],
            core:{ 
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
                multitype: {
                },
            }});
        expect(treeobj).not.toBeUndefined();
    });

    afterAll(function(){
        // Leave the tree around for now so we can see it
        //if(div) div.remove();
    });

});
// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
