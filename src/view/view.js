//view.js

var treeobj;

/*
function loadTree(tabarr)
{
    var windows={};

    // Split the tabs into per-window groups
    for(let tab in tabarr) {
        if(!(tab.windowId in windows)) {
            windows[tab.windowId] = {id: tab.windowId, name:'', tabs:[]};
        }
        windows[tab.windowId].push(tab);
    }

    // Fill in the per-window info
    for(let win in windows) {
        chrome.windows.get(win.id, {}, function(thewin) { });
    }
} //loadTree
*/

function loadTree(winarr)
{
    let dat = {};
    for(let win of winarr) {
        //console.log('Window');
        let nodeid = treeobj.create_node(null, 'Window');
        for(let tab of win.tabs) {
            //console.log('   ' + tab.title);
            treeobj.create_node(nodeid, tab.title);
        }
    } //foreach window
} //loadTree(winarr)

window.addEventListener('load',
    function() {
        console.log('TabFern view.js initializing jstree');
        //console.log($('#maintree').toString());
        $('#maintree').jstree({ 'core': {
            'animation': false,
            'multiple': false,  // for now
            'check_callback': true,  // for now, allow modifications
            themes: { 'name': 'default-dark' }
        }});
        //chrome.tabs.query({}, loadTree);
        treeobj = $('#maintree').jstree(true);
        chrome.windows.getAll({'populate': true}, loadTree);
    },
    { 'once': true }
);

// vi: set ts=4 sts=4 sw=4 et ai fo-=or: //
