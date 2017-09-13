---
title: TabFern tab-management extension for Google Chrome
---

![screenshot](https://raw.githubusercontent.com/cxw42/TabFern/gh-pages/screenshot.png)

A single window showing all your open browser windows and tabs, listed
vertically.  TabFern will also save browser windows so you can close them and
come back to them later with all their tabs intact.

# Call for alpha testers!

If you are willing, please try TabFern and let us know how it goes!

[![badge](/img/ChromeWebStore_Badge_v2_206x58.png)](https://chrome.google.com/webstore/detail/tabfern-tab-manager-and-b/hbajjpcdbninabigakflkhiogmmjaakm)

<strong>TabFern is now available in the [Chrome Web Store](https://chrome.google.com/webstore/detail/tabfern-tab-manager-and-b/hbajjpcdbninabigakflkhiogmmjaakm)</strong>

Check out the code or report issues [on GitHub](https://github.com/cxw42/TabFern).

# Usage

 - Click the icon to open the TabFern view.  The view will also open when
   you start Chrome.
 - When you open windows or tabs, or rearrange windows or tabs,
   the tree will update.
 - To mark a window to be saved, you have two choices:

     1. Give the window a name using the pencil icon (![image](https://raw.githubusercontent.com/cxw42/TabFern/master/assets/icons/pencil.png)).
     1. Hit the middle icon showing a rectangle with a red dot
   (![image](https://raw.githubusercontent.com/cxw42/TabFern/master/assets/icons/picture_delete.png)).  The window will close.

 - Folder icons are:

     - Open, unsaved: a monitor (![image](https://raw.githubusercontent.com/cxw42/TabFern/master/assets/icons/monitor.png))
     - Open, saved: a monitor with a green dot (![image](https://raw.githubusercontent.com/cxw42/TabFern/master/assets/icons/monitor_add.png)).
     - Closed, saved (closed unsaved aren't in the tree): a white file folder.

 - Saved windows will be saved even if you close them manually.  To remove them
   from the tree, hit the delete icon (red X,
   ![image](https://raw.githubusercontent.com/cxw42/TabFern/master/assets/icons/cross.png)).

 - Windows you do not expressly save will not be saved when you exit!
   I am open to discussion of better ways to handle this.

# Backup and Restore

On the menu in the bottom right, you have options for "Backup" and
"Load contents":

![screenshot of hamburger menu](/img/hamburger-screenshot.png)

 - Click "Backup now" to save a backup as a `.tabfern` file in your Downloads
   directory.
 - Click "Load contents of a backup", then choose the file you want and hit OK,
   to add the backed-up windows to your tree.

Loading a backup is not a "restore" operation that takes you
back to where you were.  Instead, it _adds_ the loaded information to
the windows and tabs you already have open or saved.  That way you don't
have to worry about losing your current place.

# Limitations

 - There is only a two-level hierarchy --- tabs cannot be the children
   of other tabs in the tree.
 - You cannot open and close individual tabs --- you have to open and close
   the window as a whole.
 - Windows will not necessarily open at the size of the last-closed window,
   like they do normally in Chrome.

See the [issue tracker](https://github.com/cxw42/TabFern/issues) on GitHub for
more about current limitations, and where TabFern is going in the future!

# Related information

 - [Privacy policy](/privacy.md)

# Thanks

 - Inspired by (but not in any way related to or affiliated with)
   [Tabs Outliner](https://chrome.google.com/webstore/detail/tabs-outliner/eggkanocgddhmamlbiijnphhppkpkmkl)
   by Vladyslav Volovyk.
 - [Extensionizr](https://extensionizr.com)
 - [jstree](https://www.jstree.com/)
 - [jstree-actions](https://github.com/alexandernst/jstree-actions)
 - [jquery](https://jquery.com/)
 - [Barnsley fern generator](http://www.chradams.co.uk/fern/maker.html)
 - [famfamfam Silk icons](http://www.famfamfam.com/lab/icons/silk/)
 - [Font Awesome](http://fontawesome.io/)

# Legal

Copyright (c) 2017 Chris White, Jasmine Hegman.  CC-BY-SA 4.0 International.

![logo](https://raw.githubusercontent.com/cxw42/TabFern/master/assets/fern128.png)

