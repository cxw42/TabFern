#!/bin/bash
# check-webstore.sh: Compare the static webstore/ tree to the current
# working tree.
# cxw 2017 - CC-BY

# Check for files that only exist in webstore/, or that differ from those in
# the master tree.
echo
echo === Files only in webstore/ or differing from master ===
find webstore -name \*.swp -o -type f -print | (
    while IFS= read -r f ; do
        diff "$f" "${f#webstore/}" &>/dev/null || echo '^^^ '"$f" ;
    done )

# Check for files in the master tree that don't exist in webstore
echo === Files in master but not in webstore/ ===
find . \( -wholename ./assets/icons -prune -o -name \*.swp -prune -o \
            -wholename ./webstore -prune -o -name .git\* -prune -o \
            -wholename ./scraps -prune -o -wholename ./webstore.js -prune -o \
            -wholename ./webstore.zip -prune -o -wholename ./test -prune \) \
    -o \( -type f \( -exec test -f webstore/{} \; -o -print \) \) | \
grep -v '^./check-webstore.sh'

cat <<EOF

Reminder: I didn't check assets/icons, so if you pulled any of those, you'll
need to copy them manually.
EOF

# vi: set ts=4 sts=4 sw=4 et ai ff=unix: #
