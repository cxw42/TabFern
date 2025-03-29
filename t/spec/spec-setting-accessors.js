// t/spec/spec-setting-accessors.js: Test app/common/setting-accessors.js
// Specs within each inner `describe` must be run in order.

describe("app/common/setting-accessors", () => {
    let S;
    const SETTING_NAME = "_test_setting";

    function removeSetting() {
        S.remove(SETTING_NAME);
    }

    beforeAll(() => {
        S = require("common/setting-accessors");
    });

    describe("string-setting accessor", () => {
        it("sets values", () => {
            S.set(SETTING_NAME, "foo");
            expect().nothing();
        });
        it("gets values", () => {
            expect(S.getString(SETTING_NAME)).toBe("foo");
        });
        afterAll(removeSetting);
    });

    describe("int-setting accessor", () => {
        it("sets values", () => {
            S.set(SETTING_NAME, 42);
            expect().nothing();
        });
        it("gets values", () => {
            expect(S.getInt(SETTING_NAME)).toBe(42);
        });
        afterAll(removeSetting);
    });
});

// vi: set ts=4 sts=4 sw=4 et ai fo-=ro foldmethod=marker: //
