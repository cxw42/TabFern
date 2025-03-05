# TabFern internals

TabFern is built using [brunch](https://brunch.io/).

See [CONTRIBUTING.md](CONTRIBUTING.md) for more about how to work with the code.

For Firefox, see
[the wiki](https://github.com/cxw42/TabFern/wiki/Developing-on-Firefox).

## Project layout

Inputs:

 - `app/`: Main source
   - `app/win/`: Popup (the main TabFern window)
   - `app/bg/`: Background page
   - `app/settings/`: The settings page
 - `brunch-config.js`: The control file that directs a build
 - `package.json`: where the version number is defined
 - `static/`: Files that are copied directly while building
   - `static/win/`: the HTML for the TabFern window
   - `static/settings/`: the HTML for the settings page
   - `static/t/`: the HTML for the Jasmine tests
   - `static/assets/`: icons, CSS, ...
 - `t/`: Jasmine tests of TabFern.  Note that not everything has a test yet.
 - `tools/`: Scripts used during the build process
 - 'var/': Files that vary depending on build options

Outputs:

 - `public/`: The Chrome plugin, ready to be loaded unpacked or zipped up.
 - `public-ff/`: The Firefox plugin, ready to be loaded unpacked or zipped up.

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

## Versioning

The version number is defined in package.json.  Read on for details.

Chrome requires a version of the form `x.y.z.w`, and permits a version name
that can have any form.  NPM (at least for purposes of `npm run`) requires
a [semantic version](https://semver.org) of the form `x.y.z` in `package.json`.
I want to show just `x.y.z` to the user as the version for regular releases,
and follow semantic versioning.  I also want to be able to push patches
without interrupting the user with a new-version notification
(what I am calling a "silent patch release").

Given these overlapping constraints, I currently store one of the following
version forms in `package.json`:

| `package.json` version | Type | Chrome version | Chrome version name |
| ---------------------- | ---- | -------------- | ------------------- |
| `x.y.z-pre.w` | Prerelease (development version) | `x.y.z.w` | `x.y.z-pre.w` |
| `x.y.z` | Normal release | `x.y.z.1337` | `x.y.z` |
| `x.y.z.w` | Silent patch release (`w`>=1338) | `x.y.z.w` | `x.y.z` |

TODO: switch to straight semver, and control the showing of new-item
notifications in a more flexible way.

[]( vi: set ft=markdown: )
