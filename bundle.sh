#!/bin/sh
# bundle.sh: bundle some JS files.
# By github @cxw42, 2017.  CC-BY 3.0.

dest="$1"
shift

rm -f "$dest"
touch "$dest"

for f in "$@" ; do
    cat >> "$dest" <<EOF
// Begin bundled file ///////////////////////////////////////////////////
// $f

EOF
    cat "$f" >> "$dest"
done

