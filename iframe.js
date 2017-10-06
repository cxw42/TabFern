if ((chrome.runtime || {}).connect) {
  chrome.runtime.connect().onMessage.addListener(msg => {
    document.body.textContent = msg;
  });
} else {
  document.body.textContent = 'FAILURE';
}