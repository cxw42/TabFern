// CC-BY-SA 3.0
console.log('TabFern: running background.js');

// From https://stackoverflow.com/q/8984047/2877364 by
// https://stackoverflow.com/users/930675/sean-bannister

// When the icon is clicked in Chrome
chrome.browserAction.onClicked.addListener(function(tab) {

    // If commonViewWindowID is undefined then there isn't a popup currently open.
    if (typeof commonViewWindowID === "undefined") {        // Open the popup
        commonLoadView();
    } else {                                // There's currently a popup open
     // Bring it to the front so the user can see it
        chrome.windows.update(commonViewWindowID, { "focused": true });
  }

});

// When a window is closed
chrome.windows.onRemoved.addListener(function(windowId) {
  // If the window getting closed is the popup we created
  if (windowId === commonViewWindowID) {
    // Set commonViewWindowID to undefined so we know the popups not open
    commonViewWindowID = undefined;
  }
});

// End of Sean's code

//var settings = new Store('settings', {
//     'sample_setting': 'This is how you use Store.js to remember values'
//});


////example of using a message handler from the inject scripts
//chrome.extension.onMessage.addListener(
//  function(request, sender, sendResponse) {
//  	chrome.pageAction.show(sender.tab.id);
//    sendResponse();
//  });

// Create the main window when Chrome starts
window.addEventListener('load',
    function() {
        console.log('TabFern: background window loaded');
        setTimeout(commonLoadView, 500);
    },
    { 'once': true }
)

console.log('TabFern: done running background.js');

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
