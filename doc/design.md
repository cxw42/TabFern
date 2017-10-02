# TabFern Design

## Basic principles
Data is stored and manipulated in its native, unescaped
form up until the point of use.  It is then escaped for HTML, CSS, or
whatever is needed at that point.  Variable names starting with `raw_`
hold the raw data.

## Save data

Save data are `{tabfern: 42, version: <whatever>, tree: []}`.
(`tabfern: 42` is magic :) )  Earlier save data, which have an array
at the top level rather than an object, are version `0`.

TabFern will always support loading backup files having versions
earlier than the current version.

In any save file, missing fields are assumed to be falsy.  Do not assume
any specific false value.

Bump the version number of the save file only when:
 - you move or delete an existing field;
 - you add a new required field; or
 - you add a new field for which a default falsy value is unworkable.

## Windows and tabs

Windows can be open or closed, and can be saved or unsaved.
A closed, unsaved window isn't represented in TabFern, except via the
"Restore last deleted window" function.

 - An open, unsaved window is referred to for brevity as an "ephemeral" window.
 - An open, saved window is, similarly, an "Elvish" window.
 - A closed, saved window is a "dormant" window.

 - A "Fern" is the subtree for a particular window, including a node
representing the window and zero or more children of that node
representing tabs.  The fern ID is the node ID of the node
representing the window.

 - An "item" is the combination of a node (`src/view/item_tree.js`) and a
details value (`src/view/item_details.js`) for that node.  An item may be
associated with a Chrome widget (Window or Tab) or not.  Each Chrome widget
is associated with exactly one item.
Items are uniquely identified by their `node_id`s in the tree.

At present, windows with no tabs are not supported.
The only exception is the holding pen, which is a special tree node that
holds detached tabs until they are attached to a Chrome window.

## Plugin data

Known plugins are stored indexed by plugin ID (`indexUrl` hash).  Under each
extension ID are at least `name`, `guest_id` (the extension ID), `enabled`,
and `indexUrl`.

 - Chrome storage key: `tabfern-plugins`
 - Data:

        {
            version: 1,
            plugins: {<id>:<plugin>, ...}
        }

 - `<plugin>`:

        {
            enabled: <boolean>,
            name: <string>,
            short_name: <string>,       (header in the plugin UI)
            indexUrl: <string>,
        }

[](about:blank# vi: set ts=4 sts=4 sw=4 et ai ft=markdown:)
