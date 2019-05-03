# TabFern internals

TabFern is built using [brunch](https://brunch.io/).

## Getting started

Clone the repo, then `npm install`.  After that you should be able to
run `npx brunch b` for a one-time build, or `npx brunch w` to rebuild
automatically on changes.

Load the `public/` directory as an unpacked extension to test in Chrome.

For Firefox, see
[the wiki](https://github.com/cxw42/TabFern/wiki/Developing-on-Firefox).

## Project layout

Inputs:

 - `app/`: Main source
   - `app/win/`: Popup (the main TabFern window)
   - `app/bg/`: Background page
   - `app/settings/`: The settings page
 - `static/`: Files that are copied directly while building
   - `static/win/`: the HTML for the TabFern window
   - `static/settings/`: the HTML for the settings page
   - `static/test/`: the HTML for the Jasmine tests
   - `static/assets/`: icons, CSS, ...
 - `test/`: Jasmine tests of TabFern.  Note that not everything has a test yet.
 - `tools/`: Scripts used during the build process

Outputs:

 - `public/`: The Chrome plugin, ready to be loaded unpacked or zipped up.
 - `public-ff/`: The Firefox plugin, ready to be loaded unpacked or zipped up.

Other:

 - `doc/`: Documentation (to be created)
 - `plugin/`: Skeleton of a TabFern plugin (to be created)

## Popup

The popup is the main TabFern window, and the heart of the project.  It is
`static/win/container.html`, which loads `static/win/main.html` in an iframe.
`app/win/main_tl.js` is the primary script file for the popup.

### Data model

I am moving towards an ALMVCBNRAA (Almost like Model-View-Controller, but not
really at all) data model.  The jstree, including DOM and objects, plus the
`item_details.js` datastores, are considered the model.  Chrome widgets
(windows and tabs) are considered the view.  `tree.js` is the controller.
Although you might think of the jstree's DOM as part of the view, I am
considering it grouped with the model so that I don't have to track
parent-child relationships two places.  Those only live in the jstree.

The tests generally test the model and stub the Chrome widgets.  The model
is currently spread between `app/win/model.js` and `app/win/main_tl.js`.
I am working on moving it all into `app/win/model.js`.

[]( vi: set ft=markdown: )
