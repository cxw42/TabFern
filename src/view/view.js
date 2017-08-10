//view.js

var treeobj;
var tab_by_treeid = {};

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
        console.log('Window ' + win.id.toString());
        let win_node_id = treeobj.create_node(null, 'Window');
        for(let tab of win.tabs) {
            console.log('   ' + tab.id.toString() + ': ' + tab.title);
            let node_data = {
                'text': tab.title
                //, 'my_crazy_field': tab.id    // <-- is thrown out
            };
            let tab_node_id = treeobj.create_node(win_node_id, node_data);
            tab_by_treeid[tab_node_id] = tab;
        }
    } //foreach window
} //loadTree(winarr)

function treeOnSelect(evt, data)
{
    console.log(data.node);
    if(typeof(data.node) !== 'undefined') {
        let thetab = tab_by_treeid[data.node.id];
        if(typeof thetab !== 'undefined') {
            chrome.tabs.highlight({
                windowId: thetab.windowId,
                tabs: [thetab.index]
            });
            chrome.windows.update(thetab.windowId, {'focused': true});
        }
    }
} //treeOnSelect

function initTree()
{
    console.log('TabFern view.js initializing jstree');
    //console.log($('#maintree').toString());

    // Create the tree
    $('#maintree').jstree({ 'core': {
        'animation': false,
        'multiple': false,  // for now
        'check_callback': true,  // for now, allow modifications
        themes: { 'name': 'default-dark' }
    }});
    //chrome.tabs.query({}, loadTree);
    treeobj = $('#maintree').jstree(true);

    // Load the tree
    chrome.windows.getAll({'populate': true}, loadTree);

    // Set event listeners
    $('#maintree').on('changed.jstree', treeOnSelect);

} //initTree()

window.addEventListener('load', initTree, { 'once': true });

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
