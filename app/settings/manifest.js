// manifest.js: Settings for TabFern
// TODO move the names into constants in common.js
//
// Note: the tabs and groups are created in the order they
// first appear in the manifest.

const S = require('common/setting-accessors');    // in app/

// Shortcuts for frequently-used items
function icon(cls) { return `<i class="${cls}"></i>`; }
function issue(nums, noparens) {
    if(!Array.isArray(nums)) {
        nums = [nums];
    }
    return (noparens?'':'(') +
        nums.map(num =>
            `<a href="https://github.com/cxw42/TabFern/issues/${num|0}">#${num|0}</a>`).join(', ') +
        (noparens?'':')');
} //issue()

function brplain(text){return `<br/><span class="plain">${text}</span>`;}

function future_i18n(x) { return x; }

let ham = icon('fa fa-bars');
let gt = icon('fa fa-lg fa-caret-right');
var editImg = icon('fff-pencil tf-action-button');
var delImg = icon('fff-cross tf-action-button');
var saveImg = icon('fff-picture-delete tf-action-button');
let settings = `${ham} ${gt} Settings ${gt}`;
let refresh_message = " (refresh the TabFern window after you change this to make the change take effect)";

let about_message = "This is TabFern version " + TABFERN_VERSION;
if(TABFERN_GIT_HASH) {
    let hash = TABFERN_GIT_HASH;
    about_message += ', built from commit ';
    about_message += `<a href="https://github.com/cxw42/TabFern/commit/${hash}">${hash}</a>`;
    console.log(about_message);
}

// Settings {{{2
let setting_definitions = [

        // Welcome page
        {
            "tab": future_i18n("Welcome / Help"),
            "group": future_i18n("Introduction"),
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
        {
            "tab": future_i18n("Welcome / Help"),
            "group": future_i18n("Incognito mode"),
            "type": "description",
            "text":
`TabFern cannot see Incognito windows or tabs, and is not yet tested in
Incognito mode.  If you would like Incognito support in TabFern, please
vote at ${issue(125,true)}.
`,
        },
        {
            "tab": future_i18n("Welcome / Help"),
            "group": future_i18n("Import/Export"),
            "id": "export-settings",
            "type": "button",
            "text": "Save settings to a file"
        },
        {
            "tab": future_i18n("Welcome / Help"),
            "group": future_i18n("Import/Export"),
            "id": "import-settings",
            "type": "button",
            "text": "Load settings from a file"
        },
        {
            "tab": future_i18n("Welcome / Help"),
            "group": future_i18n("Legal"),
            "type": "description",
            "text": "The TabFern name, logo, and icons are trademarks of Chris White."
        },
        {
            "tab": future_i18n("Welcome / Help"),
            "group": future_i18n("About"),
            "type": "description",
            "text": about_message
        },

        // Behaviour.  Yeah, there's a "u" in there!
        {
            "tab": future_i18n("Behaviour"),
            "group": future_i18n("When Chrome starts..."),
            "name": S.POPUP_ON_STARTUP,
            "type": "checkbox",
            "label": future_i18n("Open the TabFern window automatically"),
        },
        {
            "tab": future_i18n("Behaviour"),
            "group": future_i18n("When Chrome starts..."),
            "type": "description",
            "text": future_i18n("You can open the TabFern window any time by clicking the fern icon next to the address bar."),
        },
        {
            "tab": future_i18n("Behaviour"),
            "group": future_i18n("On startup or refresh..."),
            "name": S.COLLAPSE_ON_STARTUP,
            "type": "checkbox",
            "label": future_i18n("Collapse all the saved trees"),
            //"text": future_i18n("x-characters")
        },
        {
            "tab": future_i18n("Behaviour"),
            "group": future_i18n("On startup or refresh..."),
            "name": S.OPEN_TOP_ON_STARTUP,
            "type": "checkbox",
            "label": future_i18n("Sort open windows to the top")
            //"text": future_i18n("x-characters")
        },

        {
            "tab": future_i18n("Behaviour"),
            "group": future_i18n("When I..."),
            "name": S.COLLAPSE_ON_WIN_CLOSE,
            "type": "checkbox",
            "label": future_i18n("Close an open window, collapse its tree"),
            //"text": future_i18n("x-characters")
        },
//        {
//            "tab": future_i18n("Behaviour"),
//            "group": future_i18n("When I..."),
//            "name": S.COLLAPSE_ON_PARTIAL_WIN_CLOSE,
//            "type": "checkbox",
//            "label": future_i18n("Close the last tab in a partly-open window, collapse its tree"),
//            //"text": future_i18n("x-characters")
//        },
        {
            "tab": future_i18n("Behaviour"),
            "group": future_i18n("When I..."),
            "name": S.RESTORE_ON_LAST_DELETED,
            "type": "checkbox",
            "label": future_i18n("Restore the last-deleted window, reopen its tabs"),
        },
        {
            "tab": future_i18n("Behaviour"),
            "group": future_i18n("When I..."),
            "name": S.JUMP_WITH_SORT_OPEN_TOP,
            "type": "checkbox",
            "label": future_i18n('Sort open windows to the top, scroll to the top of the list'),
        },
        {
            "tab": future_i18n("Behaviour"),
            "group": future_i18n("When I..."),
            "name": S.NEW_WINS_AT_TOP,
            "type": "checkbox",
            "label": future_i18n('Open a new window, move it to the top of the list'),
        },
        {   // some extra descriptive text for S.NEW_WINS_AT_TOP
            "tab": future_i18n("Behaviour"),
            "group": future_i18n("When I..."),
            "type": "description",
            "text": `This has the practical side-effect that all open
                    windows will be sorted to the top when you open the
                    TabFern window, even if you didn't check the "Sort
                    open windows" box above.`
        },

]; //setting_definitions

setting_definitions.push(
        {
            'tab': future_i18n('Behaviour'),
            'group': future_i18n('Partly-open windows'),
            'name': S.S_OPEN_REST_ON_CLICK,
            'type': 'radioButtons',
            'label': `When only some of the tabs in a window are open,
                        what should happen when you click the
                        name of the window?`,
            'options': [
                {value: S.TRUE_S, text: 'Open all the remaining closed tabs'},
                {value: S.FALSE_S, text: 'Just bring the window to the front' +
                    ' (you can open the remaining tabs from the right-click menu)'},
            ],
        }
);

setting_definitions.push(
        {
            "tab": future_i18n("Behaviour"),
            "group": future_i18n("Deleting windows"),
            "name": S.CONFIRM_DEL_OF_SAVED,
            "type": "checkbox",
            "label": future_i18n('Prompt for confirmation before deleting <b>saved</b> windows'),
        },
        {
            "tab": future_i18n("Behaviour"),
            "group": future_i18n("Deleting windows"),
            "name": S.CONFIRM_DEL_OF_UNSAVED,
            "type": "checkbox",
            "label": future_i18n('Prompt for confirmation before deleting <b>unsaved</b> windows'),
        },

        {
            "tab": future_i18n("Behaviour"),
            "group": future_i18n("Deleting tabs"),
            "name": S.CONFIRM_DEL_OF_SAVED_TABS,
            "type": "checkbox",
            "label": future_i18n('Prompt for confirmation before deleting <b>tabs</b> in <b>saved</b> windows'),
        },
        {
            "tab": future_i18n("Behaviour"),
            "group": future_i18n("Deleting tabs"),
            "name": S.CONFIRM_DEL_OF_UNSAVED_TABS,
            "type": "checkbox",
            "label": future_i18n('Prompt for confirmation before deleting <b>tabs</b> in <b>unsaved</b> windows'),
        },
        {
            "tab": future_i18n("Behaviour"),
            "group": future_i18n("Music"),
            "name": S.CONFIRM_DEL_OF_AUDIBLE_TABS,
            "type": "checkbox",
            "label": future_i18n('Prompt for confirmation before closing or deleting a tab that is currently playing audio (<i class="fa fa-music"></i>)'),
        },

        // Appearance
        {
            "tab": future_i18n("Appearance"),
            "group": '',
            "type": "description",
            "text": future_i18n("Refresh the TabFern window to apply changes to these options.  To refresh, click TabFern's title bar and hit F5."),
        },
        {
            "tab": future_i18n("Appearance"),
            "group": future_i18n("Scrollbars"),
            "name": S.HIDE_HORIZONTAL_SCROLLBARS,
            "type": "checkbox",
            "label": future_i18n('Hide horizontal scrollbar'),
        },
        {
            "tab": future_i18n("Appearance"),
            "group": future_i18n("Scrollbars"),
            "name": S.SKINNY_SCROLLBARS,
            "type": "checkbox",
            "label": future_i18n('Skinny scrollbars'),
        },
        {
            "tab": future_i18n("Appearance"),
            "group": future_i18n("Scrollbars"),
            "id": 'scrollbar-color-picker-label',
            //"name": '',     // Don't save - settings.js handles that
            "type": "text",
            //"text": future_i18n('Skinny-scrollbar color: '),
                // placeholder - settings.js adds the actual control
                // after this.
                // TODO figure out how to make skinny-scrollbar color
                // appear properly in search results
        },
        {
            "tab": future_i18n("Appearance"),
            "group": future_i18n("Tree"),
            "name": S.SHOW_TREE_LINES,
            "type": "checkbox",
            "label": future_i18n('Show connecting lines between nodes'),
        },

        // Theming options
        {
            "tab": future_i18n("Appearance"),
            "group": future_i18n("Theme"),
            "name": S.S_THEME_NAME,
            "type": "popupButton",
            "label": future_i18n('Theme'),
            'options': [
                { value: 'default-dark', text: 'Dark' },
                { value: 'default', text: 'Light' },
            ],
        },
        {
            "tab": future_i18n("Appearance"),
            "group": future_i18n("Theme"),
            "name": S.S_BACKGROUND,
            "type": "text",
            "label": future_i18n('Background color or image'),
        },
        {
            "tab": future_i18n("Appearance"),
            "group": future_i18n("Theme"),
            "type": "description",
            "text":
`The background can be specified as a CSS color name, rgb(r,g,b), hsl(h,s,l),
or a URL (data, https, chrome-extension, or file).
To use images from your local disk (file):
<ul>
<li>Check the box for "Allow access to file URLs" in chrome://extensions</li>
<li>Open the image you want in Chrome and copy the address out of the address
bar (it will start with "file://")</li>
<li>Paste the "file://..." URL into the box above.</li>`
        },

        {
            "tab": future_i18n("Appearance"),
            "group": future_i18n("Tooltips"),
            "name": S.URL_IN_TOOLTIP,
            "type": "checkbox",
            "label": future_i18n("Show URL in each item's tooltip"),
        },
        {
            "tab": future_i18n("Appearance"),
            "group": future_i18n("Tooltips"),
            "name": S.TITLE_IN_TOOLTIP,
            "type": "checkbox",
            "label": future_i18n("Show page title in each item's tooltip"),
        },
);

setting_definitions.push(
        {
            'tab': future_i18n('Appearance'),
            'group': future_i18n('Action-button order for windows'),
            "type": "description",
            "text": future_i18n("This also sets the order of the corresponding buttons for tabs."),
        }
);

setting_definitions.push(
        {
            'tab': future_i18n('Appearance'),
            'group': future_i18n('Action-button order for windows'),
            'name': S.S_WIN_ACTION_ORDER,
            'type': 'radioButtons',
            'options': [
                {value: 'ced',
                    html: `Close and Save ${saveImg} &bull; Edit ${editImg} &bull; Delete ${delImg}` },
                {value: 'ecd',
                    html: `Edit ${editImg} &bull; Close and Save ${saveImg} &bull; Delete ${delImg}` },
                {value: 'edc',
                    html: `Edit ${editImg} &bull; Delete ${delImg} &bull; Close and Save ${saveImg}` },
            ],
        },

        // Features
        {
            "tab": "Features",
            "group": "Context Menu",
            "name": S.ENB_CONTEXT_MENU,
            "type": "checkbox",
            "label": "Enable right-click menus" + refresh_message,
        },
/*
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
*/

        {
            "tab": future_i18n("Advanced"),
            "group": '',
            "type": "description",
            "text": future_i18n("Refresh the TabFern window to apply changes to these options.  To refresh, click TabFern's title bar and hit F5."),
        },
        {
            "tab": future_i18n("Advanced"),
            "group": future_i18n("Favicons"),
            "name": S.S_FAVICON_SOURCE,
            'type': 'radioButtons',
            'label': 'Where should I fetch favicons from?',
            'options': [
                {value: S.FAVICON_SITE, text: 'The site itself (normal usage)'},
                {value: S.FAVICON_CHROME, text: 'Chrome.  Faster, but not all icons will appear.'},
                {value: S.FAVICON_DDG, text: 'DuckDuckGo'},
            ],
        },

// }}}2
// Credits {{{2
        {
            "tab": future_i18n("Credits and thanks"),
            "group": 'TabFern',
            'group_html':true,
            "type": "description",
            "text":
`TabFern is by Chris White (<a href="https://devwrench.wordpress.com">blog</a>,
<a href="https://github.com/cxw42/">GitHub</a>).  I greatly appreciate
the following contributors!  If I have accidentally missed you, please let
me know so I can correct the omission.  All names below are in case-insensitive
alphabetical order within each category.`
        },

        {
            "tab": future_i18n("Credits and thanks"),
            "group": future_i18n("Programming"),
            'group_html':true,
            "type": "description",
            "text":
`<ul>
<li><a href="https://github.com/r4j4h/">Jasmine Hegman</a></li>
<li><a href="https://github.com/Procyon-b/">Marc Boucher</a></li>
<li><a href="https://github.com/RiotPharaoh/">RiotPharaoh</a></li>
<li><a href="https://github.com/ahonn/">Yuexun Jiang</a></li>
</ul>`
        },
        {
            "tab": future_i18n("Credits and thanks"),
            "group": future_i18n("Translation"),
            'group_html':true,
            "type": "description",
            "text":
`<ul>
<li><a href="https://github.com/Makemeloco/">Makemeloco</a> (Russian)</li>
<li><a href="https://github.com/Procyon-b/">Marc Boucher</a> (French)</li>
<li><a href="https://github.com/rwexmd/">rwexmd</a> (Russian)</li>
</ul>`
        },
        {
            "tab": future_i18n("Credits and thanks"),
            "group": future_i18n("Artwork and publicity"),
            'group_html':true,
            "type": "description",
            "text":
`<ul>
<li><a href="https://github.com/sarthakpranesh/">Sarthak Pranesh</a> (website)</li>
<li><a href="https://github.com/Yasujizr/">Yasujizr</a> (logo)</li>
</ul>`
        },
        {
            "tab": future_i18n("Credits and thanks"),
            "group": future_i18n("Other"),
            'group_html':true,
            "type": "description",
            "text":
`<ul>
<li><a href="https://github.com/bluikko">bluikko</a></li>
<li><a href="https://github.com/devinrhode2/">Devin Rhode</a></li>
<li><a href="https://github.com/philiprhoades/">Phil Rhoades</a></li>
</ul>`
        });

// }}}2
// Changelog                                          {{{1
setting_definitions.push(
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.4.2${brplain('2025-XX-XX')}`,
            'group_html':true,
            "type": "description",
            "text":
`
<ul>
</ul>
`
        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.4.1${brplain('2025-04-10')}`,
            'group_html':true,
            "type": "description",
            "text":
`
<h4>TF needs developers!</h4>
<p>As you may have noticed, my time to work on TabFern is limited \u{1f605}.
If you are a JavaScript developer, could you contribute some code?  I'm happy
to help you get started!</p>
<p>If you aren't a JS dev, but know someone who is,
could you please pass the word?  Much appreciated!  You can get in touch via
<a href="https://github.com/cxw42/TabFern/discussions">GitHub discussions</a>.
</p>

<h4>Changes in this release</h4>
<ul>
<li>Bugfix: Open the TF window when the browser starts ${issue(342)}</li>
<li>Add an "About" section to ${ham} ${gt} Settings ${gt} Welcome / Help
    ${issue(347)}</li>
<li>Simplify the implementation of the Settings window ${issue(341)}</li>
<li>Internal changes ${issue([343])}</li>
</ul>
`
        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.4.0${brplain('2025-03-06')}`,
            'group_html':true,
            "type": "description",
            "text": (
`
<h2>\u26a0\ufe0f Major internal change! \u26a0\ufe0f</h2>
<p>This release of TabFern updates to
<a href="https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3"
    target="_blank">Manifest V3</a>.
This is required by Google for compatibility with newer Chrome versions.
Please <b>back up your tabs</b>, and report any issues you encounter.  Thanks!  ${issue(275)}</p>

<p>Other changes in this release:</p>
<ul>
<li>The prompt for confirmation when closing audible tabs now applies to
    individual tabs ${issue(306)}.</li>
<li>Bugfixes ${issue([321,322,335])}</li>
<li>Refactoring ${issue([307,334])}</li>
</ul>
`
            ),
        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.3.1${brplain('2022-12-25')}`,
            'group_html':true,
            "type": "description",
            "text": (
`<ul>
<li>Bugfixes ${issue(304)}</li>
</ul>
<p>Merry Christmas!</p>
`
            ),

        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.3.0${brplain('2022-12-09')}`,
            'group_html':true,
            "type": "description",
            "text": (
`<ul>
<li class="gold-star">Opening one tab at a time!  Yes, the wait is over!  ${issue(35)}
<ul>
<li>Click on a tab in a closed window to open only that tab.</li>
<li>Click the "close and save" icon (${icon('fff-picture-delete')})
    on a tab's tree entry to close only that tab.</li>
<li>To open any remaining closed tabs, right-click the window and choose
    "Open all tabs."  (See ${settings} Behaviour ${gt} Partly-open windows
    for another option.)</li>
</ul>
<p>Please note that if Chrome crashes while you have only some tabs open, the
recovered window will show up in TabFern as a separate, unsaved window
(related to ${issue(41, true)}).</p>
</li>` +
'</ul>' +
`
<h4>Help TabFern!</h4>
<p>I need people to help me develop and test.  Please volunteer or spread the
word!  That is how TabFern will continue to advance :) .  You can reach me
on <a href="https://github.com/cxw42/TabFern/discussions">GitHub</a> or
<a href="https://gitter.im/TabFern/Lobby">gitter</a>.</p>

<h4>Note about Manifest v3</h4>
<p>The <tt>chrome:extensions</tt> panel may show an error that
"Manifest version 2 is deprecated, and support will be removed in 2023."
Don't worry; I plan to have the update done in time.  ${issue(275)}</p>
`
            ),

        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.2.2${brplain('2021-12-22')}`,
            'group_html':true,
            "type": "description",
            "text": (
`<h4>Please back up!</h4>
<p>The next version of TabFern will introduce tab-at-a-time ${issue(35)}.
Please back up now (${ham} ${gt} Backup now) just in case of unexpected bugs!
Remember, TabFern carries <b>no warranty</b>.
</p>
<ul>
<li>Fixed a regression in the settings: it is now possible to set the
window action-button order again.  ${issue(208)}</li>
<li>When running a development version of TF, the commit hash will be
listed in the title bar.  This will make it easier to reference the
commit in bug reports.  ${issue(210)}</li>
<li>Icons of other extensions should now appear in the TF window.  ${issue(202)}</li>
<li>Other fixes: ${issue(196,true)}, ${issue(224,true)} (thanks to bluikko),
    ${issue(233,true)}, ${issue(236,true)}, ${issue(237,true)}</li>
<li>Known issues: ${issue(276,true)}</li>
</ul>`
            ),

        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.2.1${brplain('2020-04-04')}`,
            'group_html':true,
            "type": "description",
            "text": (
`<ul>` +
`<li class="gold-star">Special thanks to Hacktoberfest 2019 participants!
    ahonn and Procyon-b contributed code, Makemeloco contributed a translation,
    and sarthakpranesh contributed a new website.</li>` +
`<li>TabFern will warn before closing a tab that is playing audio.  ${issue(118)}</li>
<li>The TabFern window should no longer appear off-screen (unless you have
    changed monitors recently).  ${issue(189)}</li>
<li>Russian translation ${issue(194)}</li>
<li>Fix for a Chrome change that caused <tt>new_tab.html</tt> tabs to open.
    ${issue(198)}</li>
<li>Reopening the last tab in a window positions the action buttons
    correctly.  ${issue(200)}</li>
<li>The TabFern window no longer scrolls as far to the right when you click on
    long-name tabs in recent Chrome versions.  ${issue(201)}.</li>
` +
//`<li><code>about:blank</code> tabs and tab showing your new-tab page are no
//longer saved in the tree.  (${issue(186, true)}, ${issue(191, true)})</li>` +
`</ul>`
            ),
        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.2.0${brplain('2019-04-07')}`,
            'group_html':true,
            "type": "description",
            "text":
`<p>Note: Vivaldi 2.3.1440.61+ has a
<a href="https://forum.vivaldi.net/topic/35531/chrome-extension-apis-intermittently-unavailable-on-2-3-1440-61-x86">bug</a>
that sometimes causes
TabFern not to load properly.  If this happens, close the TF window and
click the TF toolbar button to reload, or hit F5.  That will probably work!
${issue(171)}</p>
<ul>
<li>TabFern now opens in a small window in the upper-left corner of the
    screen before moving to wherever you last put it.  Hopefully this
    is less disruptive visually.  ${issue(169)}
<li>Updates under the hood.  Hopefully you will see
    faster load times as a result.  ${issue([4,164])}</li>
<li>You can choose the order of the action buttons for the windows on
    ${ham} ${gt} Settings ${gt} Appearance.  ${issue(152)}<br />
    Options are:
    ${saveImg}${editImg}${delImg}, ${editImg}${saveImg}${delImg},
    or ${editImg}${delImg}${saveImg}.
</li>
<li>New logo!  Thanks to <a href="https://github.com/Yasujizr">Yasujizr</a>
    for the artwork.  ${issue(137)}</li>
<li>(Developers only) Initial Firefox support ${issue(100)}.  See
    <a href="https://github.com/cxw42/TabFern/issues/100#issuecomment-450384941">here</a> for more details.</li>
</ul>`
        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.1.19${brplain('2018-10-03')}`,
            'group_html':true,
            "type": "description",
            "text": `<ul><li>Bugfixes and internals:
                    ${issue([102, 131, 149],true)}</li></ul>`,
        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.1.18${brplain('2018-09-17')}`,
            'group_html':true,
            "type": "description",
            "text":
`<ul>
<li>New menu item to move a window to the top of the tree: right-click the
window's entry in the tree and choose "Move to top." ${issue(58)}</li>
<li>New option to choose whether to open the TabFern window automatically
when you start Chrome (on ${ham} ${gt} Settings ${gt} Behaviour).
${issue(143)} </li>
</ul>`,
        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.1.17${brplain('2018-09-02')}`,
            'group_html':true,
            "type": "description",
            "text":
`<ul>
<li class="gold-star">TabFern now has <b>500</b> users!!!
<b>Thank you</b> for using TabFern and helping the project!</li>
<li>The first version of TabFern was released one year ago today.
\u{1F382}</li>
<li>Partial translations into French and Russian.  My thanks to the
translators!  Please see the new Credits tab.  ${issue(135)}</li>
<li>Tooltips on the action buttons.  ${issue(117)}</li>
<li>${settings} Appearance ${gt} Tooltips now has options to show the
URL and title of each item in a tooltip on that item.  This way you can
see URLs in the tree, and you can see long titles without having
to scroll.  ${issue(104)}</li>
<li>You can now save and load settings from the ${future_i18n("Welcome / Help")}
tab.  ${issue(92)}</li>
<li>When you open the TF window, it moves back to its last position
more quickly.  ${issue(134)}</li>
<li><a href="https://vivaldi.com/">Vivaldi</a> support:
Basic TabFern functionality is now also available on the Vivaldi
browser.  Vivaldi uses the
Chrome Web Store just like Chrome itself does, so installation in Vivaldi
is the same as installation in Chrome.  ${issue(123)}</li>
<li><a href="https://getfirefox.com">Firefox Quantum</a> support:
If you're a developer, you can now load TabFern as a temporary add-on
and get at least the basic save/load/tab-switching.  (Note that you can't
manipulate <tt>about:debugging</tt> because it's special to Firefox.)
${issue(100)}</li>
<li>There is now a "Reload" option on the menu
(${ham} ${gt} ${icon('fa fa-refresh')} Reload), in case TabFern
and Chrome get out of sync.  ${issue(127)}</li>
<li>Bugfixes: ${issue(128,true)}, ${issue(129,true)}</li>
</ul>`
        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.1.16${brplain('2018-03-08')}`,
            'group_html':true,
            "type": "description",
            "text":
`<ul>
<li>The tree will now show the icons for the sites, even on closed windows.
Note that you may need to be online to see the icons.  ${issue(83)}</li>
<li>TabFern won't ask you if you want to delete new tabs or about:blank tabs.
Hopefully this saves you a little bit of time.  ${issue(109)}</li>
</ul>`
        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.1.15${brplain('2018-02-09')}`,
            'group_html':true,
            "type": "description",
            "text":
`<ul>
<li>TabFern now has a basic understanding of pinned tabs. ${issue(106)} ${issue(107)}</li>
<li>Better handling of crashes, recovery, and reopening tabs.  ${issue(41)} ${issue(55)} ${issue(96)}</li>
<li>We have enough experience with TabFern that I have removed the "alpha"
status!  One step closer to <a href="https://github.com/cxw42/TabFern/issues?q=is%3Aopen+is%3Aissue+milestone%3Av1.0">version 1.0</a>.</li>
</ul>`
        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.1.14${brplain('2018-01-12')}`,
            'group_html':true,
            "type": "description",
            "text":
`<ul>
<li class="gold-star">TabFern now has more than 100 users!  Wow!
You folks are fantastic!</li>
<li>There is now a red X for each tab that you can use to delete that tab.
There are also options on ${settings} Behaviour for whether you want to be
prompted before the tab is deleted.  ${issue(93)}</li>
<li>You can change the color of the narrow scrollbar to something other
than yellow:
${settings} Appearance ${gt} Scrollbars ${gt} Skinny-scrollbar color.
${issue(97)}</li>
<li>Load time should be a bit faster!</li>
</ul>`,
        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.1.13${brplain('2017-12-12')}`,
            'group_html':true,
            "type": "description",
            "text":
`<ul>
<li>The delete-confirmation dialog now takes keyboard shortcuts (y, n, c),
and provides an option to not ask again.  You can always re-enable
confirmation dialogs from ${settings} Behaviour.
${issue(85)}</li>
<li>You can now specify a custom color or background for the TabFern window.
Go to ${settings} Appearance ${gt} Theme, and put a
<a href="https://developer.mozilla.org/en-US/docs/Web/CSS/color_value">CSS color</a> or an image URL in the "Background color or image" box.
${issue(86)}</li>
<li>Going along with the custom backgrounds, you can also select a light
theme (dark text, light backgrounds) from
${settings} Appearance ${gt} Theme.  ${issue(89)}
<li>You can use skinny scrollbars to make more text visible in the TabFern
window.  Go to ${settings} Appearance ${gt} Scrollbars, and check "Skinny
scrollbars."  ${issue(68)}
</ul>`
        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.1.12${brplain('2017-11-05')}`,
            'group_html':true,
            "type": "description",
            "text":
`<ul><li class="gold-star">TabFern now has more than 60 users!  Thank you for
using TabFern, and for spreading the word!  I also appreciate those of you
that have contributed through GitHub, sent me an email, left a
review, or otherwise let me know what you think of TabFern or would like to
see in future versions.</li></ul>
<ul>
<li>You can now right-click on the TabFern icon in the Chrome toolbar,
and select "Add/edit a note for the current tab."  That will switch you to the
TabFern window, where you can edit the note, and then will switch you right
back to your tab.  Just click Cancel (or press Escape)
if you want to see the note, but not
change it.  If the TabFern window is offscreen, double-click the TabFern
icon first to bring it to the current window.  ${issue(71)}</li>
<li>On the "Behaviour" tab, you now have the option of telling TabFern to
ask you for confirmation before it deletes a window from the tree.
This does not change what happens when you close a browser window outside
of the TabFern tree.  ${issue(48)}</li>
<li>Faster vertical scrolling!  ${issue(73)}</li>
<li>Sorting open windows to top keeps the order of closed windows as it is.
${issue(78)}</li>
<li>Other fixes: ${issue(72)}</li>
</ul>`
        },
        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.1.11${brplain('2017-10-19')}`,
            'group_html':true,
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
<a href="https://github.com/cxw42/TabFern/issues/122">on GitHub</a>.  The only requirements are
a <a href="https://github.com/join">free GitHub account</a> and the willingness
to <a href="https://github.com/cxw42/TabFern/issues/new">report issues</a>
if you run across them.  Thanks for considering this request!
</p>`,
        },

        {
            "tab": future_i18n("What's new?"),
            "group": `Version 0.1.10${brplain('2017-09-26')}`,
            'group_html':true,
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
            "tab": future_i18n("What's new?"),
            "group": `Versions 0.1.8 and 0.1.9${brplain('2017-09-22')}`,
            'group_html':true,
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
                "tab": future_i18n("What's new?"),
                "group": `Version 0.1.7${brplain('2017-09-18')}`,
                'group_html':true,
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
                "tab": future_i18n("What's new?"),
                "group": `Version 0.1.6${brplain('2017-09-10')}`,
                'group_html':true,
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
                "tab": future_i18n("What's new?"),
                "group": `Version 0.1.5${brplain('2017-09-07')}`,
                'group_html':true,
                "type": "description",
                "text": "<ul><li>You can now right-click on a saved window " +
                    "and choose " +
                    '"Forget" to leave the window as open, but not save it '+
                    'for next time.  Also includes some bug fixes, including '+
                    'workarounds for Chrome 61 changes.</li></ul>'
            },
            {
                "tab": future_i18n("What's new?"),
                "group": `Version 0.1.4${brplain('2017-09-06')}`,
                'group_html':true,
                "type": "description",
                "text":
`<ul><li>Added context menus ${issue(6)},
saving of TabFern window position ${issue(22)},
and Expand All/Collapse All.</li></ul>`
            },
            {
                "tab": future_i18n("What's new?"),
                "group": `Version 0.1.2${brplain('2017-09-02')}`,
                'group_html':true,
                "type": "description",
                "text":
"<ul><li>First version released to the Chrome Web Store</li></ul>"
            }                                                     // }}}1
        );

let manifest = {
    "title":
        `${_T('wsSettings')} - ${_T('wsShortName')} (v${TABFERN_VERSION})`,
    "label": _T('wsSettings'),

    "icon": "/assets/fern128.png",
    //"settingsLabel":'',
    //"searchLabel":'',
    //"nothingFoundMessage":'',
    "settings": setting_definitions,
};

module.exports = manifest;
// vi: set fdm=marker foldenable fdl=1: //
