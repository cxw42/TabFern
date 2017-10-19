// spec/asyncinator.js: Test asyncinator.

describe('asyncinator', function() {
    let M={};       // loaded modules
    let was_extra_work_called = false;
    let was_other_extra_work_called = false;

    beforeAll(R(['multidex','jquery'],M, function() { was_extra_work_called = true; }));

    // Test calls of R() that don't provide the M destination object
    beforeAll(R(['multidex'],function(){was_other_extra_work_called = true;}));

    it('loads modules', function() {
        expect(M.multidex).not.toBeUndefined();
        expect(M.jquery).not.toBeUndefined();
        expect(window['$']).not.toBeUndefined();
    });

    it('calls the extra-work function', function() {
        expect(was_extra_work_called).toBe(true);
        expect(was_other_extra_work_called).toBe(true);
    });

    it('returns the same value if you require something twice', function(done){
        require(['multidex'], function(multidex) {
            expect(multidex).toBe(M.multidex);
            done();
        });
    });

    it('also loads global RModules', function() {
        expect(M.multidex).toBe(RModules.multidex);
        expect(M.jquery).toBe(RModules.jquery);
    });
});

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
