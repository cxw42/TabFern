// spec/spec-jstree-multitype.js: Test jstree-multitype plugin

describe('jstree-multitype', function() {
    let ASQ;
    let div;    // where the tree goes
    let treeobj;

    beforeAll(R(['jstree', 'jstree-multitype', 'asynquence',
                    'asynquence-contrib'],null,function(){
                        ASQ = RModules['asynquence-contrib'];
                    }));

    //////////////////////////////////////////////////////////////////////

    describe('creation',()=>{
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
                        {text: 'Parent', id: 'p',
                            children: [
                                {text: 'Child 1', id: 'c1'},
                                {text: 'Child 2', id: 'c2', multitype: 'foo'},
                                {text: 'Child 3', id: 'c3', multitype: ['bar']},
                                {text: 'Child 4', id: 'c4', multitype: ['baz','quux']},
                                {text: 'Child 5', id: 'c5', multitype: 'nonexistent-mtype'},
                                {text: 'Child 6', id: 'c6', multitype: ['foo','nonexistent-mtype']},
                                {text: 'Child 7', id: 'c7', multitype: ['bar','baz']},
                                {text: 'Child 8', id: 'c8', multitype: 'two-li'},
                                {text: 'Child 9', id: 'c9', multitype: 'two-a'},
                            ],
                        },
                    ],
                    animation: false,
                    multiple: false,
                    themes: {
                        name: 'default-dark',
                        variant: 'small'
                    },
                },
                multitype: {
                    foo: {li_attr:{'class':'foo'}},
                    bar: {a_attr:{'class':'bar'}},
                    baz: {li_attr:{'class':'baz'}},
                    quux: {li_attr:{'class':'quux'}},
                    'two-li': {li_attr:{'class':'li1 li2'}},
                    'two-a': {a_attr:{'class':'a1 a2'}},
                },
            }).jstree(true);
                // trailing .jstree(true) because the first .jstree
                // returns a jquery object
            expect(treeobj).not.toBeUndefined();

        });

        it('can open nodes',(done)=>{
            expect(treeobj.open_node('p',done)).toBeTruthy();
            // Need to do this, or $(<child>) won't work because the
            // children won't be in the DOM!
        });
    });

    //////////////////////////////////////////////////////////////////////

    describe('initialization',()=>{

        it('assigns an empty default multitype', function() {
            let child = treeobj.get_node('c1');
            expect(child).not.toBeFalsy();
            expect(child.multitype).toEqual([]);
        });

        it('accepts string-valued multitypes in the original data',()=>{
            let child = treeobj.get_node('c2');
            expect(child.multitype).toEqual(['foo']);
        });

        it('accepts array-valued multitypes in the original data',()=>{
            let child = treeobj.get_node('c3');
            expect(child.multitype).toEqual(['bar']);
            child = treeobj.get_node('c4');
            expect(child.multitype).toEqual(['baz','quux']);
        });

        it('does not assign multitypes if one of the listed types is unknown',()=>{
            let child = treeobj.get_node('c5');     // unknown mtype
            expect(child.multitype).toEqual([]);
            child = treeobj.get_node('c6');         // one known, one unknown
            expect(child.multitype).toEqual([]);
        });

        it('assigns li_attr from a single mtype',()=>{
            let jq = treeobj.get_node('c2',true);
            expect(jq.attr('class')).toMatch(/\bfoo\b/);
        });

        it('assigns a_attr from a single mtype',()=>{
            let jq = treeobj.get_node('c3',true);
            let a = $('a',jq);
            expect(a).toBeTruthy();
            expect(a.attr('class')).toMatch(/\bbar\b/);
        });

        it('assigns li_attr from two mtypes',()=>{
            let jq = treeobj.get_node('c4',true);
            expect(jq.attr('class')).toMatch(/\bbaz\b/);
            expect(jq.attr('class')).toMatch(/\bquux\b/);
        });

        it('assigns li_attr and a_attr from respective mtypes',()=>{
            let jq = treeobj.get_node('c7',true);
            let a = $('a',jq);
            expect(jq.attr('class')).toMatch(/\bbaz\b/);
            expect(a.attr('class')).toMatch(/\bbar\b/);
        });

        it('assigns two li_attrs from one mtype',()=>{
            let jq = treeobj.get_node('c8',true);
            expect(jq.attr('class')).toMatch(/\bli1\b/);
            expect(jq.attr('class')).toMatch(/\bli2\b/);
        });

        it('assigns two a_attrs from one mtype',()=>{
            let jq = treeobj.get_node('c9',true);
            let a = $('a',jq);
            expect(a.attr('class')).toMatch(/\ba1\b/);
            expect(a.attr('class')).toMatch(/\ba2\b/);
        });







    });

    //////////////////////////////////////////////////////////////////////

    afterAll(function(){
        // Leave the tree around for now so we can see it
        //if(div) div.remove();
    });

});
// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
