if ((chrome.runtime || {}).connect) {
  chrome.runtime.connect().onMessage.addListener(msg => {
    document.body.textContent = msg;
  });
} else {
  document.body.textContent = 'FAILURE';
}

console.log('In iframe.js, chrome.runtime is' + JSON.stringify(chrome.runtime));

