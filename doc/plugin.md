# TabFern plugin API

This document will be expanded as TabFern becomes able to provide additional
capabilities to its plugins.

## Overview

A TabFern plugin is part of a "guest" Chrome extension separate from TabFern,
which is the "host".  A single guest can have any number of TabFern plugins.
The guest can have other
functions in addition to being a TabFern plugin, although this is not required.

Each plugin in a guest provides an HTML page that TabFern
can load in an `iframe` in the TabFern window.

### Security

The guest has a different HTML origin from the host.  Therefore, each has its
own permissions and can access only its own data.  If the guest needs
permissions to any Chrome APIs, list them in the guest's manifest.  The host
and guest will eventually be able to communicate using `chrome.runtime`-based
messaging, but that is not yet implemented.

## Requirements

### Procedural

 - The guest shall clearly indicate that it includes a TabFern plugin in at
   least the `name` or `description` fields of its `manifest.json`.
   Specifically,
   at least one of those must match both `/\btabfern\b/i` and `/\bplugin/i`.
 - The guest shall provide a link to TabFern in its user-facing documentation.
   That link can be to the Chrome Web Store page, to
   <http://tinyurl.com/tabfern>, or to the
   [Github Pages site](https://cxw42.github.io/TabFern/).

### Plugin list

 - The guest shall include a file called `/tfplugin.json` (the "plugin
   list").  A JSON file permits an extension to host more than one plugin.
 - The guest shall list the plugin list in its `manifest.json` as follows:

        "web_accessible_resources": [
            "tfplugin.json"
        ]

   along with whatever other `web_accessible_resources` it wishes to list.

#### Example `tfplugin.json`

    {
        "version": 1,
        "plugins": [
            {   "name": "Sample TabFern Plugin",
                "indexUrl": "chrome-extension://kcbahbchkakjkbgnabchdbeccldkaaah/tfplugin/index.html"
            }
        ],
        "modeline": " vi: set ts=4 sts=4 sw=4 et ai: "}

In version 1 of the plugin list, the `name` and `indexUrl` of each plugin
are required.  All other fields are optional and ignored.

The `indexUrl` must be a full URL with the `chrome-extension` scheme,
not a path within the guest.  E.g., `/tfplugin/index.html` and
`https://example.com` are invalid `indexUrl`s.

The version number
of the plugin list changes on the same criteria as the version number of the
save data.  As with the save data, TabFern will always support reading plugin
lists of any version.

### Plugin identification

Each plugin is identified by:

 - Encoding its `indexUrl` in UTF-8;
 - Determining the SHA-512 hash of the UTF-8-encoded `indexUrl`; and
 - Expressing the hash in [base64](https://github.com/beatgammit/base64-js).

The base64 value is the plugin ID.  Since the `indexUrl` includes the
extension ID as part of the `chrome-extension` URL, plugin IDs are unique
per-guest and per-plugin.

### Plugin index page

 - The `indexUrl` for each plugin is the html file the host displays to a user
   when a user invokes the plugin.
 - The `indexUrl` must be listed in `web_accessible_resources`.
 - The `indexUrl` must match `/\.html?$/i`.

As far as I can tell, it is not necessary to expressly list items loaded
by the index (e.g., scripts or CSS) in the `web_accessible_resources`.
However, if you get strange errors, try adding `"tfplugin/*"` to the
manifest to see if it helps.

<!-- vi: set ts=4 sts=4 sw=4 et ai ft=markdown: -->
