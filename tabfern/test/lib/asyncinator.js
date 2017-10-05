// asyncinator.js: Require.js-Jasmine helper shim
// Copyright (c) 2017 Chris White - CC-BY 4.0 International

/// Make a `beforeAll` loader that will pull in your require.js modules.
/// Requires ES2015 (aka ES6).
///
/// Usage example:
///
///    describe("Something", function() {
///        let Modules = {};     // where our require()d modules go
///        beforeAll( R(['foo','bar'], Modules) );
///        it('should have loaded foo and bar', function() {
///            expect(Modules.foo).not.toBeUndefined();
///            expect(Modules.bar).not.toBeUndefined();
///        });
///    });
///
/// The name R() is for brevity --- it's what you Require.
///
/// @param deps {mixed}  An array of strings naming the modules you require.
///                      A string can be provided if you only need one module.
/// @param dest {Object} Optional.  An object where the loaded modules will be
///                      stored.  this must be initialized, e.g., to `{}`,
///                      *before* you call R().
/// @param extra_work {function} Optional.  If provided, extra_work() will be
///                              called before the beforeAll() is closed out.
///

/// A global to store the loaded modules, since require.js only loads any
/// given module once.
var RModules = {};

function R(deps, dest, extra_work)
{
    if(typeof dest === 'function') {    // no `dest` provided
        extra_work = dest;
        dest = null;
    }

    if(!deps) deps = [];
    if(typeof deps === 'string') deps = [deps];

    if(typeof dest !== 'undefined' && dest != null && 
            typeof dest !== 'object') {
        throw new Error('Invalid "dest" parameter to R().  Did you list several dependencies without enclosing them in an array?');
    }

    return function(done) {

        function inner(...loaded) {
            // Copy the loaded modules into #dest
            for(let depidx = 0; depidx < loaded.length; ++depidx) {
                RModules[deps[depidx]] = loaded[depidx];
                if(dest) dest[deps[depidx]] = loaded[depidx];
            }

            if(typeof extra_work === 'function') extra_work();

            done(); // Now that everything is loaded, testing can proceed.
        }; //inner

        require(deps, inner);
    };
} // R()

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
