// chrome-issue-762951.js: Hack to try to reproduce Chrome 61 issue 762951
// cxw

/// The number of the issue we're testing - must be set from the console before
/// the test routine will run
let IssueTester;

(function(root){
    /// How big our test window will be
    let testWinSize;

    /// Test URLs to choose from
    const testURLs = [ 'about:blank','chrome://extensions' ];

    /// Ignore a Chrome callback error, and suppress Chrome's "runtime.lastError"
    /// diagnostic.
    function ignore_chrome_error() { void chrome.runtime.lastError; }

    /// Run a test
    function runTest()
    {
        if(!IssueTester) return;    // user cancel control

        // Maybe add some test URLs
        let urls=[];    //[chrome.extension.getURL('/src/view/blank.html')];
                        // Use blank.html as a marker to TabFern to ignore
                        // this window?
        let r = Math.random()*3;
        for(let i=0; i<r; ++i) urls.push(testURLs[(i%testURLs.length)|0]);

        let newwin = {
              focused: false
              , left: testWinSize.left
              , top: testWinSize.top
              , width: testWinSize.width
              , height: testWinSize.height
        };
        if(urls.length>0) newwin.url = urls;

        chrome.windows.create(newwin, function(win) {
            ignore_chrome_error();
            if(win.tabs.length != urls.length) {
                console.group('Issue test');
                console.error('Length mismatch from create');
                console.log(urls);
                console.log(win);
                console.groupEnd();
                debugger;
            }

            chrome.windows.get(win.id, {populate: true}, function(getwin) {
                ignore_chrome_error();
                if(getwin.tabs.length != urls.length) {
                    console.group('Issue test');
                    console.error('Length mismatch from get');
                    console.log(urls);
                    console.log(win);   //keep win in scope
                    console.log(getwin);
                    console.groupEnd();
                    debugger;
                }
                chrome.windows.remove(getwin.id, ignore_chrome_error);
            }); //windows.get
        }); //windows.create

        // Next iteration: between one and two minutes from now
        setTimeout(runTest, (60+Math.random()*60)*1000);
    } //runTest

    /// Set testWinSize
    function findTestWindow(wins) {
        for(let win of wins) {
            if(win.tabs && win.tabs[0].url==='chrome://about/') {   //found it
                testWinSize = {
                    left: win.left,
                    top: win.top,
                    width: win.width,
                    height:win.height
                };
                console.log('Running test.  Set IssueTester to false to quit.');
                setTimeout(runTest, 0); // start the test
                return;
            }
        }
        console.warn('No window found.  Make sure there is a window open with '+
                'its first tab being chrome://about/');
    } //findTestWindow

    function DBG_TestIssue()
    {
        if(IssueTester !== 762951) {
            console.warn('Set IssueTester=762951 first.  Only use this if you '+
                    'are actually debugging and testing!  Not user code!  When you are '+
                    'ready to run, open a Chrome window with one tab set to '+
                    'chrome://about .  Put that window where you want the test windows '+
                    'to be.  Then run this function.');
            return;
        }

        chrome.windows.getAll({'populate': true}, findTestWindow);
    } //DBG_TestIssue

    root.DBG_TestIssue = DBG_TestIssue;
})(this);

// vi: set ts=4 sts=4 sw=4 et ai fo-=o fo-=r: //
