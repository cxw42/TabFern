---
title: TabFern tab-management extension for Google Chrome
---

![screenshot](/screenshot.png)

TabFern:

 - Saves browser windows so you can close them and come back to them later
with all their tabs intact
 - Backs up your windows and tabs with just two clicks!
 - Gives you a single window showing all your open browser windows and tabs,
   listed vertically.

[![badge](/img/ChromeWebStore_Badge_v2_206x58.png)](https://chrome.google.com/webstore/detail/tabfern-tab-manager-and-b/hbajjpcdbninabigakflkhiogmmjaakm)

<a name="welcome"></a>

<strong>TabFern is now available in the [Chrome Web Store](https://chrome.google.com/webstore/detail/tabfern-tab-manager-and-b/hbajjpcdbninabigakflkhiogmmjaakm)</strong>


Check out the code or report issues [on GitHub](https://github.com/cxw42/TabFern).

# Usage

 - Click the fern icon (![image](/assets/fern16icon.png))
   in the Chrome toolbar to open the TabFern view.
   The view will also open when you start Chrome.
     - If you can't find the TabFern window, double-click the fern icon in the
       taskbar in any Chrome window.  That will summon the TabFern window
       to that Chrome window.

 - The TabFern view shows a list of all your open windows and tabs, in white.
   It shows you saved windows and tabs in gray.

 - You can control other Chrome windows from the TabFern window by
   right-clicking their entries, or by clicking the corresponding
   buttons that appear at the right when you hover
   the mouse pointer over the window's name.

 - To mark a window to be saved, you have two choices:

     1. Give the window a name using the pencil icon
        (![image](/assets/icons/pencil.png)).
     1. Hit the middle icon showing a rectangle with a red dot
   (![image](/assets/icons/picture_delete.png)).  The window will close.

 - Folder icons are:

     - Open, unsaved: a monitor
       (![image](/assets/icons/monitor.png))
     - Open, saved: a monitor with a green dot
       (![image](/assets/icons/monitor_add.png)).
     - Closed, saved (closed unsaved aren't in the tree): a white file folder.

 - Saved windows will be saved even if you close them manually.  To remove them
   from the tree, hit the delete icon (red X,
   ![image](/assets/icons/cross.png)).

     - If you accidentally delete a window, look on the main menu (bottom-right
       of the TabFern window --- see next section).
       There will be a "Restore last deleted" option that will
       bring the tabs back.

 - To change the text size in the TabFern window, click into the window,
   then hit Control+Plus for larger or Control+Minus for smaller.  This is the
   normal Google Chrome browser zoom.

 - For help, sorting, options, or more functions, click the menu icon
   (**&equiv;**) at the bottom right of the TabFern window.

 - Note: windows you do not expressly save will not be saved when you exit!
   I am open to discussion of better ways to handle this.

# Backup and Restore

On the menu in the bottom right (**&equiv;**), you have options for "Backup" and
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

 - [Privacy policy](privacy.md)

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
 - Hosted on GitHub Pages &mdash; Theme modified from
   [Leap Day](https://github.com/pages-themes/leap-day) by
   [mattgraham](https://twitter.com/michigangraham)

![logo](/assets/fern128.png)

<!-- vi: set ts=2 sts=2 sw=2 et ai ft=markdown: -->
