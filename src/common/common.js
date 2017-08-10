
var commonViewWindowID;

// Open the view
function commonLoadView()
{
    console.log("TabFern: Opening view");
    chrome.windows.create(
        { 'url': chrome.runtime.getURL('src/view/view.html'),
          'type': 'popup',
          'focused': true
        },
        function(win) {
            commonViewWindowID = win.id;
        });
} //loadView()

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
