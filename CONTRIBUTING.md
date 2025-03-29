# Contributing to TabFern

This file replaces the old
[wiki page](https://github.com/cxw42/TabFern/wiki/Hacking-on-TabFern).

See [INTERNALS.md](INTERNALS.md) for more about the structure of the code.

## Legal

By contributing to TabFern, you license your contribution for use under
CC-BY-SA 3.0, or any later version, at the option of the person using
your contribution.  See [LICENSE.md](LICENSE.md) for the license text
and more details.

Please do not use _any_ code or other content from
Stack Overflow or any other Stack Exchange Web site.  Explanation follows.

In 2019, Stack Exchange (SE) went through a
[relicensing process](https://meta.stackexchange.com/q/333615/274096).
SE has not provided information I need about licenses to SE-hosted
content.  I would like to avoid introducing any ambiguity into the TabFern code
base if at all possible.  Thank you for your understanding!

## Style

- Use an [EditorConfig](https://editorconfig.org) plugin in your editor.
- Say `npm run format` to auto-format JavaScript code.

## Getting started

1. Install Git.
   - If you have never used git before, there are lots of tutorials online.  I
     found [Think Like a Git](http://think-like-a-git.net/) very helpful.
     Remember that whatever you do on your local copy won't mess up anyone
     else, so you can relax :) .
1. Install [node.js](https://nodejs.org/) v10+.
1. Install [npm](https://docs.npmjs.com/cli/v6) v6+.  It comes with node.js on
   some systems and is a separate package on others.
1. At a command line, `npm install -g npx`.
1. Fork this repo and clone your fork to your local machine.
   * **Update 2021-12-11** The default branch is called `main` (not `master`).

## Developing

We use a [Brunch](https://brunch.io/docs/getting-started)-based workflow.  See
below for why.  Developing on the `main` branch involves:

1. At a command prompt (`cmd` or `bash`, whichever works), `cd` to the
   directory where your fork is.
1. Create a new branch (e.g., `git checkout -b mybranch origin/main`)
1. Run `npm install`.  This will download all the other packages TabFern and
   its build process use.
   * If this hangs, try the solution by [xiata](https://github.com/xiata)
     [here](https://github.com/npm/cli/issues/1673#issue-678698649).
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
   - If you change anything in `manifest.json`, `var/`, `brunch-config.js`,
     or `app/bg`, you will probably need to reload the extension.  In Chrome,
     go to `chrome://extensions` and click the circular arrow in TabFern's box.

If you want to make a `.zip`, e.g., to try installing from a different folder,
say `npm run zip`.  The output will be in `webstore-<VERSION>.zip`.

### Build notes

- A tweaked version of Brunch builds the plugin into public/.
  The tweaks are [here](https://github.com/cxw42/brunch/tree/1527).

- If you get a warning that says:

  > Browserslist: caniuse-lite is outdated. Please run next command `npm update`

  run `npx browserslist@latest --update-db`.  `npm update` won't actually help.
  Thanks to Andrey Sitnik for this
  [answer](https://github.com/postcss/autoprefixer/issues/1184#issuecomment-456729370).

### Why `brunch`?

Two reasons:

1. It permits us to use [npm](https://www.npmjs.com/) packages much more
   easily.  (It also permits more easily keeping those packages up to date!)
1. It gives us flexibility to adjust the build for other targets, such as
   Firefox ([#100](https://github.com/cxw42/TabFern/issues/100)).

This workflow takes a bit of getting used to, but works fairly well.

## Cookbook

This section includes instructions for some specific tasks.

### Adding a new setting

A good example is [this commit](https://github.com/cxw42/TabFern/commit/3ac0f27415048ad86eb20626bed4859d70766a4d).

1. Decide what type of setting it is.  Currently TF divides
   Booleans (checkboxes) from everything else.

2. Edit `app/common/setting-definitions.js` to add the data storage
   and code interface to the setting:
   - In the "Names of settings" section, go to the end of the "Booleans"
     or "Strings", depending on the type (boolean or other, respectively).
   - For booleans, add a paragraph following this template:

         _NAM.CFG_POPUP_ON_STARTUP = 'SETTING-NAME';
         _DEF[_NAM.CFG_POPUP_ON_STARTUP] = DEFAULT;
         _VAL[_NAM.CFG_POPUP_ON_STARTUP] = _vbool;

   - For other, add a paragraph following this template:

         _NAM.CFGS_THEME_NAME = 'SETTING-NAME';
         _DEF[_NAM.CFGS_THEME_NAME] = DEFAULT;
         _VAL[_NAM.CFGS_THEME_NAME] = (v)=>{
             CODE
        };

     `CODE` is a validator.  It should check the given input and return a
     valid value for the setting, or `undefined` to use the default.

   - In the above paragraphs:
     - `DEFAULT` must be `true` or `false` for booleans, or a string for others.
     - `SETTING-NAME` should be a name that is all lowercase ASCII plus hyphens.

3. Edit `app/settings/manifest.js` to add the user interface to the setting:
   - In the "Settings" section, find the tab to which you want to add the
     setting.  It will be listed as a value of the `tab` field.
   - Scroll down to the point at which you want to add the setting.  This
     should be after the last setting in that tab unless there is a
     compelling reason to do otherwise.  Settings appear in the interface
     in the order given in the `setting_definitions` array.
   - Copy and paste one of the `{ }` blocks, each of which is a setting.
     Pick one that matches the type of UI control you want (e.g.,
     `type: checkbox` or `type: text`).  See [here](https://github.com/altryne/extensionizr/blob/a6ca3352b1d8b97fa4961209fd050ed7f8bd6e53/ext/src/options_custom/README.md)
     for more documentation of the available options.
   - Edit the values appropriately.

### Miscellaneous

- If you add a name ending with `id` (in any case), and it's not all
  upper-case, please spell it `Id` rather than `ID` or `id`.  That will help
  avoid bugs like #304.  Thanks!

## Notes about dependencies

The following dev dependencies are listed in `package.json` but **not used**
directly by TF itself.  They are listed to increase the minimum required
version satisfying an indirect dependency.  If you add such a dependency to
`package.json`, please also add it here.

- acorn
- archiver
- fstream
- lodash
- minimist
- mixin-deep
- path-parse
- set-value
- tar
