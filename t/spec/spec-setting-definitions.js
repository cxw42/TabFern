// t/spec/spec-setting-definitions.js: Test app/common/setting-definitions.js

describe("app/common/setting-definitions", () => {
    let SD;

    beforeAll(() => {
        SD = require("common/setting-definitions");
    });

    describe("default bool validator", () => {
        it("accepts real bools", () => {
            expect(SD.validate_bool(true)).toBe(true);
        });
        it("rejects stringified bools", () => {
            expect(SD.validate_bool("true")).toBeUndefined();
        });
    });

    describe("default int validator", () => {
        it("accepts real ints", () => {
            expect(SD.validate_int(42)).toBe(42);
        });
        it("accepts stringified ints", () => {
            expect(SD.validate_int("42")).toBe(42);
        });
        it("rejects non-ints", () => {
            expect(SD.validate_int("foo")).toBeUndefined();
        });
        it("rejects NaNs", () => {
            expect(SD.validate_int(NaN)).toBeUndefined();
        });
    });
});

// vi: set ts=4 sts=4 sw=4 et ai fo-=ro foldmethod=marker: //
