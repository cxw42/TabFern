#!/bin/bash
# check-webstore.sh: Compare the static webstore/ tree to the current
# working tree.
# cxw 2017 - CC-BY

# Check for files that only exist in webstore/, or that differ from those in
# the master tree.
echo
echo === Files different in / and /webstore/ ===
for f in LICENSE.md README.md ; do
    diff "$f" "webstore/$f" &>/dev/null || echo "$f"
done

echo === Files only in webstore/ or differing from tabfern/ ===
find webstore -name \*.swp -o -wholename webstore/LICENSE.md -o \
    -wholename webstore/README.md -o -type f -print | \
    while IFS= read -r f ; do
        diff "$f" "tabfern/${f#webstore/}" &>/dev/null || echo "$f"
    done

echo === Files in tabfern/ but not in webstore/ ===
find tabfern \( -wholename tabfern/assets/icons -prune -o -name \*.swp -prune -o \
            -wholename tabfern/webstore -prune -o -name .git\* -prune -o \
            -wholename tabfern/scraps -prune -o -wholename tabfern/webstore.js -prune -o \
            -wholename tabfern/webstore.zip -prune -o -wholename tabfern/test -prune -o \
            -wholename tabfern/node_modules -prune \) \
    -o \( -type f \( -exec dash -c 'f="webstore/${0#tabfern/}" ; [ -f "$f" ]' {} \; -o -print \) \)

cat <<EOF

Reminder: I didn't check assets/icons, so if you pulled any of those, you'll
need to copy them manually.
EOF

if [[ $1 = '-z' ]]; then
    rm -f ./webstore.zip
    pushd webstore
    zip -r ../webstore.zip *
    popd
fi

# vi: set ts=4 sts=4 sw=4 et ai ff=unix: #
