// tree-main.js: main script for src/view/tree.html.
// Part of TabFern.  Copyright (c) cxw42, r4j4h, 2017.

console.log('Loading TabFern '); // + TABFERN_VERSION);

console.log({'tree initial': chrome.runtime});

if ((chrome.runtime || {}).connect) {
  chrome.runtime.connect().onMessage.addListener(msg => {
    document.body.textContent = msg;
  });
} else {
  document.body.textContent = 'FAILURE';
}

chrome.management.getSelf(function(foo){console.log(foo);});


// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
