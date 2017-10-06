//Comment all of the four lines below for success; uncomment any for failure

void window.frames[0];
//console.log(window.frames[0]);
//void document.getElementsByTagName( "iframe" )[ 0 ].contentWindow;
//window.setTimeout(goCrazy, 0);

let W;

function goCrazy(){ 
    // Success, at least when this happens onload
    void window.frames[0]; 
    W = window.frames[0];
    void document.getElementsByTagName( "iframe" )[ 0 ].contentWindow;
    document.getElementById('message').textContent = 'loaded';
    console.log('In test.js (top level), onload, chrome.runtime is' + JSON.stringify(chrome.runtime));
}

window.addEventListener('load', goCrazy, { 'once': true });

console.log('In test.js (top level), chrome.runtime is' + JSON.stringify(chrome.runtime));

// vi: set ts=4 sts=4 sw=4 et ai: //
