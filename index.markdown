---
title: TabFern
non_markdown: 1
links:
    nav:
        - href: '#usage'
          text: Usage
        - href: '#backup'
          text: Backup & Restore
        - href: '#limit'
          text: Limitations
        - href: '#related'
          text: Other
---

<div class="content-section">
%= side_image '/static/screenshot.png' , begin
# What TabFern does
- Saves browser windows so you can close them and come back to them later
  with all their tabs intact
- Backs up your windows and tabs with just two clicks!
- Gives you a single window showing all your open browser windows and tabs,
  listed vertically.
% end
</div>

<!-- TODO center -->
%= markdown '![Chrome Web Store badge](/static/ChromeWebStore_Badge_v2_206x58.png)'

<div class="content-section">
%= offset_anchor 'usage'
%= markdown begin
# Usage

- Click the fern icon&nbsp;&nbsp;<img src="/static/fern16icon.png">&nbsp;&nbsp;in the Chrome toolbar to open the TabFern view.  The view will also open when you start Chrome. (If you can’t find the TabFern window,
    double-click the fern icon in the taskbar in any Chrome window. That will summon the TabFern window to that Chrome window.)

- The TabFern view shows a list of all your open windows and tabs, in white. It shows you saved windows and tabs in gray.

- You can control other Chrome windows from the TabFern window by right-clicking their entries, or by clicking the corresponding buttons that appear at the right when you hover the mouse pointer over the window’s name.

- To mark a window to be saved, you have two choices:-
  - Give the window a name using the pencil icon&nbsp;<img src="/static/pencil.png">
  - Hit the middle icon showing a rectangle with a red dot <img src="/static/picture_delete.png">. The window will close.

- Folder icons are:
  - Open, unsaved: a monitor&nbsp;&nbsp;<img src="/static/monitor.png"><br>
  - Open, saved: a monitor with a green dot&nbsp;&nbsp;<img src="/static/monitor_add.png">
  - Closed, saved (closed unsaved aren’t in the tree): a white file folder.

- Saved windows will be saved even if you close them manually. To remove them from the tree, hit the delete icon&nbsp;&nbsp;<img src="/static/cross.png">&nbsp;&nbsp;(If you accidentally delete a window, look on the
main menu (bottom-right of the TabFern window — see next section). There will be a "Restore last deleted" option that will bring the tabs back.)

- To change the text size in the TabFern window, click into the window, then hit Control+Plus for larger or Control+Minus for smaller. This is the normal Google Chrome browser zoom.

- For help, sorting, options, or more functions, click the menu icon (<strong>≡</strong>) at the bottom right of the TabFern window.

- Note: windows you do not expressly save will not be saved when you exit!<br>I am open to discussion of better ways to handle this.
%= end
</div>

<div class="content-section">
%= offset_anchor 'backup'
%= side_image '/static/hamburger-screenshot.png', begin
# Backup and Restore

On the menu in the bottom right (**≡**), you have options for "Backup"
and&nbsp;"Load contents".

- Click "Backup now" to save a backup as a .tabfern file in your Downloads directory.
- Click "Load contents of a backup", then choose the file ou want and hit OK, to add the backed-up windows to your tree.
- Loading a backup is not a "restore" operation that takes you back to where you were. Instead, it **adds** the loaded information to the windows and tabs you already have open or saved. That way you don’t have to worry about losing your current place.
%= end
</div>

<div class="content-section">
%= offset_anchor 'limit'
%= markdown begin
# Limitations

- There is only a two-level hierarchy — tabs cannot be the children&nbsp;of other tabs in the tree.

- You cannot open and close individual tabs — you have to open and close the window as a whole.

- Windows will not necessarily open at the size of the last-closed window,&nbsp;like they do normally in Chrome.

See the&nbsp;&nbsp;<a href="https://github.com/cxw42/TabFern/issues">issue tracker</a>&nbsp; on GitHub for&nbsp;more about current limitations, and where TabFern is going in the future!
%= end
</div>

<div class="content-section">
%= offset_anchor 'related'
%= markdown begin
# Related information

## Privacy Policy

Click [here](privacy.html).

%= offset_anchor 'thanks'
## Thanks to

%= end
<ul>
<li>Inspired by (but not in any way related to or affiliated with)&nbsp;<a href="https://chrome.google.com/webstore/detail/tabs-outliner/eggkanocgddhmamlbiijnphhppkpkmkl">Tabs Outliner</a>&nbsp;by&nbsp; Vladyslav Volovyk&nbsp;</li>
<li><code></code><a href="https://extensionizr.com">Extensionizr</a></code></li>
<li><code><a href="https://www.jstree.com/">jstree</a><br></code></li>
<li><code><a href="https://github.com/alexandernst/jstree-actions">jstree-actions</a><br></code></li>
<li><code><a href="https://jquery.com/">jquery</a></code></li>
<li><a href="http://www.chradams.co.uk/fern/maker.html">Barnsley fern generator</a><br></li>
<li><a href="http://www.famfamfam.com/lab/icons/silk/">famfamfam Silk icons</a><br></li>
<li><a href="https://www.caktusgroup.com/blog/2017/10/23/css-tip-fixed-headers-and-section-anchors/">Caktus Group</a>
</ul>
