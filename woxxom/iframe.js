console.log({'iframe.js start':chrome.runtime});

if ((chrome.runtime || {}).connect) {
  chrome.runtime.connect().onMessage.addListener(msg => {
    document.body.textContent = msg;
  });
} else {
  document.body.textContent = 'FAILURE';
}

chrome.management.getSelf(function(foo){console.log(foo);});

