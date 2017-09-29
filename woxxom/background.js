run();
chrome.browserAction.onClicked.addListener(run);

function run() {
  chrome.windows.create({url: chrome.runtime.getURL('src/view/index.html'), type: 'popup'});
}

chrome.runtime.onConnect.addListener(port => {
  port.postMessage('SUCCESS');
});
