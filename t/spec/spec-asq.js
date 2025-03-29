// spec/asq.js: Test asq-helpers and other asq foo.

describe("asq-helpers", function () {
    let ASQ, ASQH;

    beforeAll(() => {
        ASQ = require("asynquence");
        ASQH = require("lib/asq-helpers");
    });

    it("can be loaded successfully", function () {
        expect(ASQ).not.toBeUndefined();
        expect(ASQH).not.toBeUndefined();
    });

    describe("NowCC", () => {
        it("runs the parameter before the callback (asq check)", (done) => {
            let flag = false;
            let seq = ASQH.NowCC((cc) => {
                expect(flag).toBe(false);
                flag = true;
                void chrome.runtime.lastError;
                cc(); // call manually, since we don't have a Chrome function
            }).val(() => {
                expect(flag).toBe(true);
                done();
            });
        });

        it("runs the parameter before the callback (setTimeout check)", (done) => {
            let flag = false;
            let seq = ASQH.NowCC((cc) => {
                expect(flag).toBe(false);
                flag = true;
                void chrome.runtime.lastError;
                cc(); // call manually, since we don't have a Chrome function
            });

            setTimeout(() => {
                expect(flag).toBe(true);
                done();
            }, 0);
        });
    });

    describe("NowCCTry", () => {
        it("runs the NowCCTry parameter before the callback (asq check)", (done) => {
            let flag = false;
            let seq = ASQH.NowCCTry((cc) => {
                expect(flag).toBe(false);
                flag = true;
                void chrome.runtime.lastError;
                cc(); // call manually, since we don't have a Chrome function
            }).val(() => {
                expect(flag).toBe(true);
                done();
            });
        });

        it("runs the NowCCTry parameter before the callback (setTimeout check)", (done) => {
            let flag = false;
            let seq = ASQH.NowCCTry((cc) => {
                expect(flag).toBe(false);
                flag = true;
                void chrome.runtime.lastError;
                cc(); // call manually, since we don't have a Chrome function
            });

            setTimeout(() => {
                expect(flag).toBe(true);
                done();
            }, 0);
        });

        // TODO

        //    ASQH.NowCCTry((cc)=>{chrome.tabs.getCurrent(cc);}).val((foo)=>{console.log(foo);}).or((err)=>{console.log({err: err});});
        //{then: ƒ, or: ƒ, onerror: ƒ, gate: ƒ, all: ƒ, …}
        //VM1271:1 {active: true, audible: false, autoDiscardable: true, discarded: false, favIconUrl: "", …}

        //ASQH.NowCCTry((cc)=>{chrome.tabs.get(0,cc);}).val((foo)=>{console.log(foo);}).or((err)=>{console.log({err: err});});
    });
});
// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
