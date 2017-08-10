//view.js

window.addEventListener('load',
    function() {
        console.log('TabFern view.js initializing jstree');
        console.log($('#maintree').toString());
        $('#maintree').jstree({ 'core': {
            'animation': false,
            'multiple': false,  // for now
            themes: { 'name': 'default-dark' }
        }});
    },
    { 'once': true }
);

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
