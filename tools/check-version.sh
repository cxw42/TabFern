#!/bin/bash
# check-version.sh: report version numbers in TabFern
function check() {
    ack_opts=( -m 1 --nocolor --nopager --output '$line_no: $line' )
        # $filename is also available
    echo -n "$1: "
    ack "${ack_opts[@]}" VERSION "$1" ||
        ack "${ack_opts[@]}" version "$1"
}

files=(package.json package-lock.json)

for tree in tabfern webstore ; do
    files+=(${tree}/manifest.json ${tree}/src/common/common.js)
done

for f in "${files[@]}" ; do
    check "$f"
done

if [[ $1 = '-e' ]]; then
    vi "${files[@]}"
fi
# vi: set ts=4 sts=4 sw=4 et ai: #
