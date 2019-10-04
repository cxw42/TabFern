# Contributing to TabFern

This file replaces the old
[wiki page](https://github.com/cxw42/TabFern/wiki/Hacking-on-TabFern).

At the moment, TabFern has a split personality: the `master` branch is where development is happening, but the version on the Chrome Web Store is the `legacy` branch.  Please do development on the `master` branch.

## Legal

By contributing to TabFern, you license your contribution for use under
CC-BY-SA 3.0, or any later version, at the option of the person using
your contribution.  See [LICENSE.md](LICENSE.md) for the license text
and more details.

**Update 2019-09-30** Please do not use _any_ code or other content from
Stack Overflow or any other Stack Exchange Web site.  Explanation follows.
I hope to be able to remove this request in the near future!

Stack Exchange is currently going through a
[relicensing process](https://meta.stackexchange.com/q/333615/274096),
and has not provided information I need about licenses to Stack Exchange-hosted
content.  I would like to avoid introducing any ambiguity into the TabFern code
base if at all possible.  Thank you for your understanding!

## Getting started

1. Install Git.
   - If you have never used git before, there are lots of tutorials online.  I
     found [Think Like a Git](http://think-like-a-git.net/) very helpful.
     Remember that whatever you do on your local copy won't mess up anyone
     else, so you can relax :) .
1. Install [node.js](https://nodejs.org/).  It comes with `npm`.
1. At a command line, `npm install -g npx`.
1. Fork this repo and clone your fork to your local machine.

## Developing

We use a [Brunch](https://brunch.io/docs/getting-started)-based workflow.  See
below for why.  Developing on the `master` branch involves:

1. At a command prompt (`cmd` or `bash`, whichever works), `cd` to the
   directory where your fork is.
1. Create a new branch (e.g., `git checkout -b mybranch origin/master`)
1. Run `npm install`.  This will download all the other packages TabFern and
   its build process use.
1. Run `npx brunch w`.  This will build `app/` and the other directories in the
   branch into `public/`.  It will also leave `brunch` running.  (To build but
   not leave `brunch` running, say `npx brunch b`.)
1. Load the `public/` directory as an unpacked extension.
   - In Chrome, go to `chrome://extensions`.  Turn on "Developer Mode" in the
     upper right.  Click "Load unpacked" and navigate to the `public/`
     directory.  Click "Select folder."

   - For Firefox, see the
    [Firefox wiki page](https://github.com/cxw42/TabFern/wiki/Developing-on-Firefox).
1. Hack away!  As you make changes, `brunch` will automatically rebuild the
   files in `public/`.
1. After you make changes to any files, refresh the TabFern or settings window
   to see them.
   - If you change anything in `manifest.json` or `app/bg`, you will probably
     need to reload the extension.  In Chrome, got to `chrome://extensions` and
     click the circular arrow in TabFern's box.

## Why `brunch`?

Two reasons:

1. It permits us to use [npm](https://www.npmjs.com/) packages much more
   easily.  (It also permits more easily keeping those packages up to date!)
1. It gives us flexibility to adjust the build for other targets, such as
   Firefox ([#100](https://github.com/cxw42/TabFern/issues/100)).

This workflow takes a bit of getting used to, but works fairly well.

