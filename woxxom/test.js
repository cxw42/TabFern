//Comment all of the four lines below for success; uncomment any for failure

//console.log(window.frames[0]);
//void window.frames[0];
//void document.getElementsByTagName( "iframe" )[ 0 ].contentWindow;
//window.setTimeout(goCrazy, 0);

let W;

function goCrazy(){ 
    // Success, at least when this happens onload
    void window.frames[0]; 
    W = window.frames[0];
    void document.getElementsByTagName( "iframe" )[ 0 ].contentWindow;
    document.getElementById('message').textContent = 'loaded';
}

window.addEventListener('load', goCrazy, { 'once': true });

// vi: set ts=4 sts=4 sw=4 et ai: //
