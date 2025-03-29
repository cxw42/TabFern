// spec/spec-jstree-multitype.js: Test jstree-multitype plugin
// NOTE: run these in order.

describe("jstree-multitype", () => {
    let ASQ, $;
    let div; // where the tree goes
    let treeobj;

    beforeAll(() => {
        $ = require("jquery");
        require("lib/jstree");
        require("lib/jstree-multitype");
        require("asynquence");
        ASQ = require("asynquence-contrib");
    });

    //////////////////////////////////////////////////////////////////////

    describe("creation", () => {
        it("loads OK", () => {
            expect($.jstree.plugins.multitype).not.toBeUndefined();
            expect(ASQ).not.toBeUndefined();
        });

        it("can be created and load data", (done) => {
            div = $("<div />").appendTo("body");
            expect(div).not.toBeUndefined();

            // Set up the test to complete once the load_node.jstree
            // event fires.
            div.one("load_node.jstree", done);
            // Ref. https://stackoverflow.com/q/9114565/2877364

            treeobj = div
                .jstree({
                    plugins: ["wholerow", "multitype"],
                    core: {
                        check_callback: true, //permit programmatic manipulation
                        data: [
                            {
                                text: "Parent",
                                id: "p",
                                children: [
                                    { text: "Child 1", id: "c1" },
                                    {
                                        text: "Child 2",
                                        id: "c2",
                                        multitype: "foo",
                                    },
                                    {
                                        text: "Child 3",
                                        id: "c3",
                                        multitype: ["bar"],
                                    },
                                    {
                                        text: "Child 4",
                                        id: "c4",
                                        multitype: ["baz", "quux"],
                                    },
                                    {
                                        text: "Child 5",
                                        id: "c5",
                                        multitype: "nonexistent-mtype",
                                    },
                                    {
                                        text: "Child 6",
                                        id: "c6",
                                        multitype: ["foo", "nonexistent-mtype"],
                                    },
                                    {
                                        text: "Child 7",
                                        id: "c7",
                                        multitype: ["bar", "baz"],
                                    },
                                    {
                                        text: "Child 8",
                                        id: "c8",
                                        multitype: "two-li",
                                    },
                                    {
                                        text: "Child 9",
                                        id: "c9",
                                        multitype: "two-a",
                                    },
                                    {
                                        text: "Child 10",
                                        id: "c10",
                                        multitype: ["two-a", "other-a"],
                                    },
                                    { text: "Child 11", id: "c11" },
                                    {
                                        text: "Child 10",
                                        id: "c12",
                                        multitype: "foo",
                                    },
                                ],
                            },
                        ],
                        animation: false,
                        multiple: false,
                        themes: {
                            name: "default-dark",
                            variant: "small",
                        },
                    },
                    multitype: {
                        //known types
                        foo: {
                            li_attr: { class: "foo", title: "title-foo" },
                            icon: "icon-foo",
                        },
                        bar: {
                            a_attr: { class: "bar", title: "title-bar" },
                            icon: "icon-bar",
                        },
                        baz: {
                            li_attr: { class: "baz", title: "title-baz" },
                            icon: "icon-baz",
                        },
                        quux: {
                            li_attr: { class: "quux", title: "title-quux" },
                            icon: "icon-quux",
                        },
                        "two-li": {
                            li_attr: {
                                class: "li1 li2",
                                title: "title-two-li",
                            },
                        },
                        "two-a": {
                            a_attr: { class: "a1 a2", title: "title-two-a" },
                            icon: "two-a-icon",
                        },
                        "other-a": {
                            a_attr: { class: "a3 a4", title: "title-other-a" },
                        },
                        combo: {
                            li_attr: {
                                class: "li-combo",
                                title: "title-combo-li",
                            },
                            a_attr: {
                                class: "a-combo",
                                title: "title-combo-a",
                            },
                            icon: "icon-combo",
                        },
                    },
                })
                .jstree(true);
            // trailing .jstree(true) because the first .jstree
            // returns a jquery object
            expect(treeobj).not.toBeUndefined();
        });

        it("can open nodes", (done) => {
            expect(treeobj.open_node("p", done)).toBeTruthy();
            // Need to do this, or $(<child>) won't work because the
            // children won't be in the DOM!
        });
    });

    //////////////////////////////////////////////////////////////////////

    describe("initialization", () => {
        it("assigns an empty default multitype", () => {
            let child = treeobj.get_node("c1");
            expect(child).not.toBeFalsy();
            expect(child.multitype).toEqual([]);
        });

        it("accepts string-valued multitypes in the original data", () => {
            let child = treeobj.get_node("c2");
            expect(child.multitype).toEqual(["foo"]);
        });

        it("accepts array-valued multitypes in the original data", () => {
            let child = treeobj.get_node("c3");
            expect(child.multitype).toEqual(["bar"]);
            child = treeobj.get_node("c4");
            expect(child.multitype).toEqual(["baz", "quux"]);
        });

        it("does not assign multitypes if one of the listed types is unknown", () => {
            let child = treeobj.get_node("c5"); // unknown mtype
            expect(child.multitype).toEqual([]);
            child = treeobj.get_node("c6"); // one known, one unknown
            expect(child.multitype).toEqual([]);
        });

        it("assigns li_attr.class from a single mtype", () => {
            let jq = treeobj.get_node("c2", true);
            expect(jq.attr("class")).toMatch(/\bfoo\b/);
        });

        it("assigns li_attr.title from a single mtype", () => {
            let jq = treeobj.get_node("c2", true);
            expect(jq.attr("title")).toBe("title-foo");
        });

        it("assigns a_attr.class from a single mtype", () => {
            let jq = treeobj.get_node("c3", true);
            let a = $("a", jq);
            expect(a).toBeTruthy();
            expect(a.attr("class")).toMatch(/\bbar\b/);
        });

        it("assigns a_attr.title from a single mtype", () => {
            let jq = treeobj.get_node("c3", true);
            let a = $("a", jq);
            expect(a).toBeTruthy();
            expect(a.attr("title")).toBe("title-bar");
        });

        it("assigns li_attr.class from two mtypes", () => {
            let jq = treeobj.get_node("c4", true);
            expect(jq.attr("class")).toMatch(/\bbaz\b/);
            expect(jq.attr("class")).toMatch(/\bquux\b/);
        });

        it("assigns li_attr.title from the latter of two mtypes", () => {
            let jq = treeobj.get_node("c4", true);
            expect(jq.attr("title")).not.toBe("title-baz");
            expect(jq.attr("title")).toBe("title-quux");
        });

        it("assigns li_attr and a_attr from respective mtypes", () => {
            let jq = treeobj.get_node("c7", true);
            let a = $("a", jq);
            expect(jq.attr("class")).toMatch(/\bbaz\b/);
            expect(jq.attr("title")).toBe("title-baz");
            expect(a.attr("class")).toMatch(/\bbar\b/);
            expect(a.attr("title")).toBe("title-bar");
        });

        it("assigns two li_attrs from one mtype", () => {
            let jq = treeobj.get_node("c8", true);
            expect(jq.attr("class")).toMatch(/\bli1\b/);
            expect(jq.attr("class")).toMatch(/\bli2\b/);
        });

        it("assigns two a_attrs from one mtype", () => {
            let jq = treeobj.get_node("c9", true);
            let a = $("a", jq);
            expect(a.attr("class")).toMatch(/\ba1\b/);
            expect(a.attr("class")).toMatch(/\ba2\b/);
        });

        it("sets the icon based on a single multitype", () => {
            let child = treeobj.get_node("c2");
            expect(child.multitype).toEqual(["foo"]);
            let jq = $("a i", treeobj.get_node("c2", true));
            expect(jq.attr("class")).toMatch(/\bicon-foo\b/);
        });

        it("sets the icon based on the later of two multitypes", () => {
            let jq = $("a i", treeobj.get_node("c4", true));
            expect(jq.attr("class")).toMatch(/\bicon-quux\b/);
            expect(jq.attr("class")).not.toMatch(/\bicon-baz\b/);
        });

        it("detects existent multitypes", () => {
            expect(treeobj.has_multitype("c4", "quux")).toBeTruthy();
        });

        it("does not detect nonexistent multitypes", () => {
            expect(
                treeobj.has_multitype("c4", "no-such-multitype")
            ).toBeFalsy();
        });
    });

    //////////////////////////////////////////////////////////////////////

    describe("deletion", () => {
        it("doesn't remove nonexistent multitypes", () => {
            let child = treeobj.get_node("c2");
            expect(
                treeobj.del_multitype(child, "no-such-multitype")
            ).toBeTruthy();
        });

        it("removes li_attr from a single-multitype node", () => {
            let child = treeobj.get_node("c2");
            expect(treeobj.del_multitype(child, "foo")).toBeTruthy();
            let jq = treeobj.get_node("c2", true);
            expect(jq.attr("class")).not.toMatch(/\bfoo\b/);
            expect(jq.attr("title")).toBeUndefined();
        });

        it("removes one li_attr from a multi-multitype node", () => {
            let child = treeobj.get_node("c4");
            expect(treeobj.del_multitype(child, "baz")).toBeTruthy();
            let jq = treeobj.get_node("c4", true);
            expect(jq.attr("class")).not.toMatch(/\bbaz\b/);
            expect(jq.attr("class")).toMatch(/\bquux\b/); // quux is still there
            expect(jq.attr("title")).toBe("title-quux");
        });

        it("leaves the icon when removing a multitype other than the last", () => {
            let jq = $("a i", treeobj.get_node("c4", true));
            expect(jq.attr("class")).not.toMatch(/\bicon-baz\b/);
            expect(jq.attr("class")).toMatch(/\bicon-quux\b/);
        });

        it("removes one a_attr from a multi-multitype node", () => {
            let child = treeobj.get_node("c10");
            let res = treeobj.del_multitype(child, "two-a");
            expect(res).toBeTruthy();
            let jq = $("a", treeobj.get_node("c10", true));
            expect(jq.attr("class")).not.toMatch(/\ba1\b/);
            expect(jq.attr("class")).toMatch(/\ba3\b/);
        });

        it("leaves the earlier-type a_attr when removing the last mtype in a multi-multitype node", () => {
            let child = treeobj.get_node("c7");
            let res = treeobj.del_multitype(child, "baz");
            expect(res).toBeTruthy();
            let jq = $("a", treeobj.get_node("c7", true));
            expect(jq.attr("class")).toMatch(/\bbar\b/);
            expect(jq.attr("title")).toEqual("title-bar");
        });

        it("updates the icon when removing the last-listed multitype", () => {
            // baz was already removed in the previous test
            let jq = $("a i", treeobj.get_node("c7", true));
            expect(jq.attr("class")).not.toMatch(/\bicon-baz\b/);
            expect(jq.attr("class")).toMatch(/\bicon-bar\b/);
        });

        it("updates the icon when removing the last multitype", () => {
            let child = treeobj.get_node("c7");
            let res = treeobj.del_multitype(child, "bar");
            expect(res).toBeTruthy();
            let jq = $("a i", treeobj.get_node("c7", true));
            expect(jq.attr("class")).not.toMatch(/\bicon-baz\b/);
            expect(jq.attr("class")).not.toMatch(/\bicon-bar\b/);
        });

        it("leaves the icon alone when removing an mtype not listing an icon", () => {
            let child = treeobj.get_node("c9");
            let res = treeobj.del_multitype(child, "other-a");
            expect(res).toBeTruthy();
            let jq = $("a i", treeobj.get_node("c9", true));
            expect(jq.attr("class")).toMatch(/\btwo-a-icon\b/);
        });

        it("removes the entry from node.multitype", () => {
            let child = treeobj.get_node("c12");
            expect(child.multitype).toEqual(["foo"]);
            let res = treeobj.del_multitype(child, "foo");
            expect(res).toBeTruthy();
            expect(child.multitype).toEqual([]);
        });
    });

    //////////////////////////////////////////////////////////////////////

    describe("insertion", () => {
        it("sets a new icon", () => {
            let child = treeobj.get_node("c8");
            let old_icon = treeobj.get_icon("c8");
            expect(old_icon).toBe(true); //default icon
            treeobj.add_multitype("c8", "foo");
            let new_icon = treeobj.get_icon("c8");
            expect(new_icon).toMatch(/\bicon-foo\b/);
        });

        it("adds new li_attrs", () => {
            let jq = treeobj.get_node("c2", true);
            expect(jq.attr("class")).not.toMatch(/\bbaz\b/);
            expect(treeobj.add_multitype("c2", "baz")).toBeTruthy();
            expect(jq.attr("class")).toMatch(/\bbaz\b/);
            expect(jq.attr("title")).toBe("title-baz");
        });

        it("adds new a_attrs", () => {
            let jq = $("a", treeobj.get_node("c4", true));
            expect(jq.attr("class")).not.toMatch(/\bbar\b/);
            expect(treeobj.add_multitype("c4", "bar")).toBeTruthy();
            expect(jq.attr("class")).toMatch(/\bbar\b/);
            expect(jq.attr("title")).toBe("title-bar");
        });

        it("adds combo attrs", () => {
            let li = treeobj.get_node("c1", true);
            let a = $("a", li);
            let i = $("i", a);
            expect(li.attr("class")).not.toMatch(/\bli-combo\b/);
            expect(li.attr("title")).not.toBe("title-combo-li");
            expect(a.attr("class")).not.toMatch(/\ba-combo\b/);
            expect(a.attr("title")).not.toBe("title-combo-i");
            expect(i.attr("class")).not.toMatch(/\bicon-combo\b/);

            expect(treeobj.add_multitype("c1", "combo")).toBeTruthy();

            expect(li.attr("class")).toMatch(/\bli-combo\b/);
            expect(li.attr("title")).toBe("title-combo-li");
            expect(a.attr("class")).toMatch(/\ba-combo\b/);
            expect(a.attr("title")).toBe("title-combo-a");
            expect(i.attr("class")).toMatch(/\bicon-combo\b/);
        });

        it("adds the entry to node.multitype", () => {
            let child = treeobj.get_node("c12");
            expect(child.multitype).toEqual([]);
            let res = treeobj.add_multitype(child, "foo");
            expect(res).toBeTruthy();
            expect(child.multitype).toEqual(["foo"]);
        });
    });

    //////////////////////////////////////////////////////////////////////

    describe("icons", () => {
        let node_id, li, a, i;

        it("creates a node", (done) => {
            ASQ()
                .then((sdone) => {
                    node_id = treeobj.create_node(
                        null,
                        { text: "New", icon: "icon-plain" },
                        "last",
                        sdone
                    );
                })
                .val(() => {
                    expect(node_id).toBeTruthy();
                    expect(typeof node_id).toBe("string");
                    li = treeobj.get_node(node_id, true);
                    a = $("a", li);
                    i = $("i", a);
                    done();
                });
        });

        it("overrides manually-set icons by the multitype", () => {
            expect(i.attr("class")).toMatch(/\bicon-plain\b/);
            expect(i.attr("class")).not.toMatch(/\bicon-foo\b/);

            expect(treeobj.add_multitype(node_id, "foo")).toBeTruthy();
            expect(i.attr("class")).not.toMatch(/\bicon-plain\b/);
            expect(i.attr("class")).toMatch(/\bicon-foo\b/);
        });

        it("overrides the multitype by manually-set icons", () => {
            treeobj.set_icon(node_id, "icon-manual");
            expect(i.attr("class")).toMatch(/\bicon-manual\b/);
            expect(i.attr("class")).not.toMatch(/\bicon-plain\b/);
            expect(i.attr("class")).not.toMatch(/\bicon-foo\b/);
        });

        it("keeps multitype overrides on the default icon", () => {
            treeobj.set_icon(node_id, true);
            expect(i.attr("class")).not.toMatch(/\bicon-manual\b/);
            expect(i.attr("class")).not.toMatch(/\bicon-plain\b/);
            expect(i.attr("class")).toMatch(/\bicon-foo\b/);
        });
    });

    //////////////////////////////////////////////////////////////////////

    afterAll(() => {
        // Leave the tree around for now so we can see it
        if (div) div.remove();
    });
});
// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
