// optional.js: RequireJS plugin to mark modules as optional.
// Modified from https://stackoverflow.com/a/27422370/2877364 by
// https://stackoverflow.com/users/80779/lordofthepigs
// Additional explanation at http://xion.io/post/code/requirejs-optional.html

// Use as "optional!<whatever module name>".  Returns null if the module
// could not be loaded.

define("optional", [], {
    load : function (moduleName, parentRequire, onLoadSuccess, config) {

        var onLoadFailure = function(err){
            // optional module failed to load.
            var failedId = err.requireModules && err.requireModules[0];
            console.warn("Could not load optional module: " + failedId);

            // Undefine the module to cleanup internal stuff in requireJS
            requirejs.undef(failedId);

            // Now define the module instance as null to mark failure
            define(failedId, [], function(){return null;});

            // Now require the module make sure that requireJS thinks
            // that is it loaded. Since we've just defined it, requirejs
            // will not attempt to download any more script files and
            // will just call the onLoadSuccess handler immediately.
            parentRequire([failedId], onLoadSuccess);
        }

        parentRequire([moduleName], onLoadSuccess, onLoadFailure);
    }
});

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
