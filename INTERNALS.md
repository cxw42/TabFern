# TabFern internals

## Project layout

 - `/tabfern`: The development tree for TabFern itself
   * `/tabfern/src`: Main source
     - `/tabfern/src/bg`: Background page
     - `/tabfern/src/view`: Popup
     - `/tabfern/src/options_custom`: Options page
   * `/tabfern/test`: Jasmine tests of TabFern
 - `/dist`: where build output from the build process will eventually go.
 - `/webstore`: The latest version of TabFern released to the Chrome Web Store.
   Updated manually by the maintainers.
 - `/doc`: Documentation
 - `/scraps`: Holding pen for code that may yet be useful.  Nothing in the
   project relies on the contents of `/scraps`.
 - `/plugin`: Skeleton of a TabFern plugin

## Popup

The popup is the main TabFern window, and the heart of the project.  It is
`src/view/main.html`, which loads `src/view/tree.html` in an iframe.
`tree.html` and `tree.js` are the primary files for the popup.

### Data model

I am moving towards an ALMVCBNRAA (Almost like Model-View-Controller, but not
really at all) data model.  The jstree, including DOM and objects, plus the
`item_details.js` datastores, are considered the model.  Chrome widgets
(windows and tabs) are considered the view.  `tree.js` is the controller.
Although you might think of the jstree's DOM as part of the view, I am
considering it grouped with the model so that I don't have to track
parent-child relationships two places.  Those only live in the jstree.

[]( vi: set ft=markdown: )
