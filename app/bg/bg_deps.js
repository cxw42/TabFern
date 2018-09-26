// main_deps.js: The dependencies for main_tl.js.  This is the entryPoint used
// by Brunch to start bundling.

// A static require statement that brunch will pick up on, but that will
// never actually run.  This is what tells Brunch to include these
// top-level modules.
if((window||global||this||{}).this_var_should_never_ever_exist_bang) {
    require('./background_tl');
}

module.exports = {
};

// vi: set ts=4 sts=4 sw=4 et ai: //
