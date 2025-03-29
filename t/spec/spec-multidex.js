// spec/multidex.js: Test multidex.

describe("multidex", function () {
    let Multidex;
    let dex; // a multidex we will test

    beforeAll(() => {
        Multidex = require("lib/multidex");
    });

    it("can be loaded successfully", function () {
        expect(Multidex).not.toBeUndefined();
    });

    it("can create a new multidex", function () {
        dex = Multidex(["key"], ["val1", "val2"]);
        expect(dex).not.toBeUndefined();
        expect(dex.all_values).not.toBeUndefined();
    });

    it("can store values by key", function () {
        let val = dex.add({ key: 42, val1: "1", val2: "2" });
        expect(val).not.toBeFalsy();
    });

    it("can retrieve values by key", function () {
        let retrieved = dex.by_key(42);
        expect(retrieved).not.toBeFalsy();
        expect(retrieved.key).toBe(42);
        expect(retrieved.val1).toBe("1");
        expect(retrieved.val2).toBe("2");
    });
});
// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
