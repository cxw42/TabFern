run();
chrome.browserAction.onClicked.addListener(run);

function run() {
  chrome.windows.create({url: 'test.html', type: 'popup'});
}

chrome.runtime.onConnect.addListener(port => {
  port.postMessage('SUCCESS');
});