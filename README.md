# TabFern

Very basic extension for vertical, grouped tabs.  Inspired by
[Tabs Outliner](https://chrome.google.com/webstore/detail/tabs-outliner/eggkanocgddhmamlbiijnphhppkpkmkl)
by Vladyslav Volovyk.

# Usage

 - Click the icon to open the TabFern view.
 - When you open windows or tabs, or rearrange windows or tabs _within a
   particular browser window_, the tree will update.
 - To mark a window to be saved, hit the middle icon
   (![image](https://raw.githubusercontent.com/cxw42/TabFern/master/assets/icons/picture_delete.png)).  It will close.  The next time you re-open it, it
   will have an icon showing it is saved (![image](https://raw.githubusercontent.com/cxw42/TabFern/master/assets/icons/monitor_add.png)).
 - Saved windows will be saved even if you close them manually.  To remove them
   from the tree, hit the delete icon (red X,
   ![image](https://raw.githubusercontent.com/cxw42/TabFern/master/assets/icons/cross.png)).

 - Windows you do not expressly save will not be saved when you exit!
   I am open to discussion of better ways to handle this.

# Limitations

 - The tree will not update when you drag tabs between browser windows.
 - There is only a two-level hierarchy --- tabs cannot be the children
   of other tabs in the tree.
 - Lots of others I'm not going to list right now!

# Thanks

 - [Extensionizr](https://extensionizr.com)
 - [jstree](https://www.jstree.com/)
 - [jstree-actions](https://github.com/alexandernst/jstree-actions)
 - [jquery](https://jquery.com/)
 - [Barnsley fern generator](http://www.chradams.co.uk/fern/maker.html)

# Legal

Copyright (c) 2017 Chris White.  CC-BY-SA 4.0 International.

