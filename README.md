# TabFern

Very basic extension for vertical, grouped tabs.  Inspired by
[Tabs Outliner](https://chrome.google.com/webstore/detail/tabs-outliner/eggkanocgddhmamlbiijnphhppkpkmkl)
by Vladyslav Volovyk.

# Usage

 - Click the icon to open the TabFern view.  The view will also open when
   you start Chrome.
 - When you open windows or tabs, or rearrange windows or tabs _within a
   particular browser window_, the tree will update.
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

# Limitations

 - The tree will not update when you drag tabs between browser windows.
 - There is only a two-level hierarchy --- tabs cannot be the children
   of other tabs in the tree.
 - You cannot open and close individual tabs --- you have to open and close
   the window as a whole.
 - Lots of others I'm not going to list right now!

# Thanks

 - [Extensionizr](https://extensionizr.com)
 - [jstree](https://www.jstree.com/)
 - [jstree-actions](https://github.com/alexandernst/jstree-actions)
 - [jquery](https://jquery.com/)
 - [Barnsley fern generator](http://www.chradams.co.uk/fern/maker.html)
 - [famfamfam Silk icons](http://www.famfamfam.com/lab/icons/silk/)

# Legal

Copyright (c) 2017 Chris White.  CC-BY-SA 4.0 International.

