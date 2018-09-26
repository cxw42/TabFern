// app/win/main_tl.js

let Modules = require('win/main_deps');

$('body').html(`Hello, world! from ${__filename}
    <span class="fa fa-fort-awesome" />`);


function spin() {
    let spinner = new Modules.spin.Spinner();
    spinner.spin($('body')[0]);
    window.setTimeout(()=>{spinner.stop(); spinner = null;}, 2000);
}

spin();

// vi: set ts=4 sts=4 sw=4 et ai fo-=ro foldmethod=marker: //
