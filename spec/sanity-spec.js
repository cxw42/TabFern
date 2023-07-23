describe("Tests", ()=> {
    it("should run", ()=> {
        expect(true).toBeTrue();
    });

    it("should be able to load modules", ()=> {
        m = require('../lib/hamburger');
        expect(m).toBeTruthy();
    });
});
