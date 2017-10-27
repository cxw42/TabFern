// manifest.js: Settings for TabFern
// TODO move the names into constants in common.js
// Note: the tabs and groups are created in the order they
// first appear in the manifest.
(function(root){
    // Shortcuts for frequently-used items
    function icon(cls) { return `<i class="${cls}"></i>`; }
    function issue(num) { return `(<a href="https://github.com/cxw42/TabFern/issues/${num|0}">#${num|0}</a>)`; }
    let ham = icon('fa fa-bars');
    let gt = icon('fa fa-lg fa-caret-right');
    let refresh_message = " (refresh the TabFern window after you change this to make the change take effect)"

    // Assign the settings
    root.manifest = {
        "name": "Settings - ver. "+TABFERN_VERSION+' - TabFern',
        "icon": "/assets/fern16.png",
        "settings": [

            // Welcome page
            {
                "tab": i18n.get("Welcome / Help"),
                "group": i18n.get("Introduction"),
                "name": "welcome-intro",
                "type": "description",
                "text": "<p>Welcome to TabFern!  Each Chrome window you have open "+
                        "or saved is represented in the TabFern window.  "+
                        "Right-click on those representations or hover " +
                        "the mouse over them for options.  Click the " +
                        ham + ' menu for more options.</p>' +
                        '<p>The tabs at the left have settings and, at the bottom'+
                        ' of the list, information about recent feature additions'+
                        ' or changes.</p>'
            },

            // Behaviour.  Yeah, there's a "u" in there!
            {
                "tab": i18n.get("Behaviour"),
                "group": i18n.get("On startup or refresh..."),
                "name": CFG_COLLAPSE_ON_STARTUP,
                "type": "checkbox",
                "label": i18n.get("Collapse all the saved trees"),
                //"text": i18n.get("x-characters")
            },
            {
                "tab": i18n.get("Behaviour"),
                "group": i18n.get("On startup or refresh..."),
                "name": CFG_OPEN_TOP_ON_STARTUP,
                "type": "checkbox",
                "label": i18n.get("Sort open windows to the top")
                //"text": i18n.get("x-characters")
            },

            {
                "tab": i18n.get("Behaviour"),
                "group": i18n.get("When I..."),
                "name": "collapse-tree-on-window-close",
                "type": "checkbox",
                "label": i18n.get("Close a window, collapse its tree"),
                //"text": i18n.get("x-characters")
            },
            {
                "tab": i18n.get("Behaviour"),
                "group": i18n.get("When I..."),
                "name": CFG_RESTORE_ON_LAST_DELETED,
                "type": "checkbox",
                "label": i18n.get("Restore the last-deleted window, reopen its tabs"),
            },
            {
                "tab": i18n.get("Behaviour"),
                "group": i18n.get("When I..."),
                "name": CFG_JUMP_WITH_SORT_OPEN_TOP,
                "type": "checkbox",
                "label": i18n.get('Sort open windows to the top, scroll to the top of the list'),
            },
            {
                "tab": i18n.get("Behaviour"),
                "group": i18n.get("When I..."),
                "name": CFG_NEW_WINS_AT_TOP,
                "type": "checkbox",
                "label": i18n.get('Open a new window, move it to the top of the list'),
            },
            {   // some extra descriptive text for CFG_NEW_WINS_AT_TOP
                "tab": i18n.get("Behaviour"),
                "group": i18n.get("When I..."),
                "type": "description",
                "text": `This has the practical side-effect that all open
                        windows will be sorted to the top when you open the
                        TabFern window, even if you didn't check the "Sort
                        open windows" box above.`
            },

            // Appearance
            {
                "tab": i18n.get("Appearance"),
                "group": i18n.get("Functions"),
                "name": CFG_HIDE_HORIZONTAL_SCROLLBARS,
                "type": "checkbox",
                "label": i18n.get('Hide horizontal scrollbar' + refresh_message),
            },
            // Maybe add some theming options here?
            {
                "tab": i18n.get("Appearance"),
                "group": i18n.get("Tree"),
                "name": CFG_SHOW_TREE_LINES,
                "type": "checkbox",
                "label": i18n.get('Show connecting lines between nodes' + refresh_message),
            },

            // Features
            {
                "tab": "Features",
                "group": "Context Menu",
                "name": CFG_ENB_CONTEXT_MENU,
                "type": "checkbox",
                "label": "Enable right-click menus" + refresh_message,
            },
            {
                "tab": "Features",
                "group": "Key Mapping",
                "name": "KeyBinds.Enabled",
                "type": "checkbox",
                "label": "Enable key mapping" + refresh_message,
            },

            {
                "tab": "Key Mappings",
                "group": "Persistence Control",
                "name": "KeyMappings.PersistenceControl.SaveButton",
                "type": "button",
                "text": "Save"
            },
            {
                "tab": "Key Mappings",
                "group": "Persistence Control",
                "name": "KeyMappings.PersistenceControl.RevertButton",
                "type": "button",
                "text": "Revert"
            },

            // Key Mappings.
            // TODO Generate these from code.
            {
                "tab": "Key Mappings",
                "group": "Key Bindings",
                "name": "KeyMappings.KeyBinds.IgnoreContextMenu.KeyBind",
                "type": "text",
                "text": "IgnoreContextMenu"
            },
            {
                "tab": "Key Mappings",
                "group": "Key Bindings",
                "name": "KeyMappings.KeyBinds.IgnoreContextMenu.ClearButton",
                "type": "button",
                "text": "Clear"
            },
            {
                "tab": "Key Mappings",
                "group": "Key Bindings",
                "name": "KeyMappings.KeyBinds.IgnoreContextMenu.EnterBindModeButton",
                "type": "button",
                "text": "Bind"
            },
            {
                "tab": "Key Mappings",
                "group": "Key Bindings",
                "name": "KeyMappings.KeyBinds.IgnoreContextMenu.AdditionalBindButton",
                "type": "button",
                "text": "X or + or don't show when these are dynamic"
            },

            // Changelog
            {
                "tab": i18n.get("What's new?"),
                "group": "Version 0.1.12",
                "type": "description",
                "text":
`<ul>
<li>You can now right-click on the TabFern icon in the Chrome toolbar,
and select "Add/edit a note for the current tab."  That will switch you to the
TabFern window, where you can edit the note, and then will switch you right
back to your tab.  Just hit Cancel if you want to see the note, but not
change it.  If the TabFern window is offscreen, double-click the TabFern
icon to bring it to the current window.  ${issue(71)}</li>
<li>Sorting open windows to top keeps the order of closed windows as it is.
${issue(78)}</li>
<li>Other fixes: ${issue(72)}</li>
</ul>`
            },
            {
                "tab": i18n.get("What's new?"),
                "group": "Version 0.1.11",
                "type": "description",
                "text":
`
<ul>
<li>You can now drag individual tabs in the tree between open and closed
windows!  When you drag a tab to a closed window,
the tab will close.  It will be available when
you open that closed window, though.  ${issue(36)}
</li>
<li>On the right-click menu for a window, there is now a "Remember" option
(${icon('fa fa-link')})
to mark a window to be saved.  Previously you had to add a note or a border,
or close the window &mdash; now you don't have to do any of those.</li>
<li>On the Appearance tab, you can turn on and off connecting lines
between the nodes in the tree.  ${issue(65)}</li>
<li>If you forget a window that has notes on some of the tabs, those notes will
be shown in red to remind you that they will be gone if you don't save
the window.  A small thing, but I hope it helps!</li>
</ul>
<p>Would you be willing to run a pre-release version?  You would get the
new features about a week earlier that way&nbsp;:)&nbsp;.  If so, please
<a href="mailto:tabfern@zoho.com">send me a note</a> or ping me
<a href="https://github.com/cxw42">on GitHub</a>.  The only requirements are
a <a href="https://github.com/join">free GitHub account</a> and the willingness
to <a href="https://github.com/cxw42/TabFern/issues/new">report issues</a>
if you run across them.  Thanks for considering this request!
</p>`,
            },

            {
                "tab": i18n.get("What's new?"),
                "group": "Version 0.1.10",
                "type": "description",
                "text":
`
<ul>
<li class="gold-star">TabFern now has more than 25 users!  Thank you for being
one of them!</li>
<li>You can drag and drop tabs between open windows from the TabFern tree.
(Drag-and-drop between open windows and closed windows is still in the works.)
${issue(36)}</li>
<li>On the "Appearance" tab, you can turn off the horizontal scrollbar to
save a bit of vertical space.  ${issue(38)}</li>
<li>New options on the Behaviour tab to keep your open windows at the top
of the list.  This may reduce the need for scrolling.</li>
<li>PDFs without a favicon now show as
${icon('fff-page-white-with-red-banner')}.  My use case involves a lot of
locally-stored PDFs, and this helps me find them more quickly.</li>
</ul>`,
            },
            {
                "tab": i18n.get("What's new?"),
                "group": "Versions 0.1.8 and 0.1.9",
                "type": "description",
                "text":
`<ul>
<li>You can right-click a tab to give it a top border.  This lets you
visually separate tabs in the tree at any point.  ${issue(56)}</li>
<li>You can also right-click a tab or press ${icon('fff-pencil')}
to add a note to yourself!
The note will be displayed on the tab's item in the tree.
Notes are saved with the tree, so your notes will stick around
as long as you want.  ${issue(57)}</li>
<li>Sorting open windows to the top, to make it easier to find them!
${ham} ${gt} Sort ${gt} ${icon('fff-text-padding-top')}</li>
<li>You can now drag and drop tabs in the tree within and between closed
windows.  ${issue(36)}</li>
<li>You can also drag and drop open tabs within an open window to
rearrange them.  (Drag-and-drop between open windows is coming soon, but not
ready yet.)  ${issue(36)}</li>
</ul>`,
            },
            {
                "tab": i18n.get("What's new?"),
                "group": "Version 0.1.7",
                "type": "description",
                "text":
    '<ul>' +
    '<li>Numeric sort order options (on the '+ham+' '+gt+' Sort menu)  ' +
    issue(43) +
    '</li>'+
    '<li>"Restore last deleted" option on the '+ham+' menu  ' +
    issue(30) + '</li>'+
    '<li>To close the '+ham+' menu without the keyboard, move the mouse off of it for a second or two</li>'+
    '<li>Improvements under the hood for robustness</li>'+
    '</ul>'
            },
            {
                "tab": i18n.get("What's new?"),
                "group": "Version 0.1.6",
                "type": "description",
                "text":
    '<ul>' +
    '<li>Sorting list by window name (on the '+ham+' '+gt+' Sort menu)  '+
    issue(43) + '</li>'+
    '<li>You can now drag and drop windows to rearrange them in the tree!  '
    +issue(36) + '</li>'+
    '</ul>'
            },
            {
                "tab": i18n.get("What's new?"),
                "group": "Version 0.1.5",
                "type": "description",
                "text": "You can now right-click on a saved window and choose "+
                    '"Forget" to leave the window as open, but not save it '+
                    'for next time.  Also includes some bug fixes, including '+
                    'workarounds for Chrome 61 changes.'
            },
            {
                "tab": i18n.get("What's new?"),
                "group": "Version 0.1.4",
                "type": "description",
                "text":
`Added context menus ${issue(6)},
saving of TabFern window position ${issue(22)},
and Expand All/Collapse All.`
            },
            {
                "tab": i18n.get("What's new?"),
                "group": "Version 0.1.2",
                "type": "description",
                "text": "First version released to the Chrome Web Store"
            }
        ]
    };
})(this);
// vi: set ts=4 sts=4 sw=4 et ai: //
