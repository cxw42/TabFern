// spec/jstree.js: Test basic jstree operations

describe("jstree", function () {
    let $;
    let new_div; // where the tree goes
    let treeobj;

    beforeAll(() => {
        $ = require("jquery");
        require("lib/jstree");
    });

    it("can be created", function () {
        new_div = $("<div />").appendTo("body");
        // Ref. https://stackoverflow.com/q/9114565/2877364
        expect(new_div).not.toBeUndefined();
        let treeobj = new_div.jstree();
        expect(treeobj).not.toBeUndefined();
    });

    afterAll(function () {
        if (new_div) new_div.remove();
    });
});
// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
