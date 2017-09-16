#!/bin/bash
# grab-commit.sh: Make a copy of all the files touched by a particular commit
# cxw42 at Github 2017 - CC-BY

do_grab=y
if [[ $1 = '-n' ]]; then
    do_grab=
    shift
fi

if [[ ! $1 ]]; then
    echo 'grab-commit.sh [-n] <tree-ish>'
    echo 'With -n, just list the files.'
    exit
fi

[[ $do_grab ]] && mkdir -p "$1"

# Get the list of filenames touched by this commit
mapfile -t filenames < \
    <(git diff-tree --no-commit-id --name-only -m -r "$1" -- | sort | uniq )
    # Thanks to https://stackoverflow.com/a/30988704/2877364 by
    # https://stackoverflow.com/users/7552/glenn-jackman for the tip about
    # mapfile.
    #
    # Thanks to https://stackoverflow.com/a/424142/2877364 by
    # https://stackoverflow.com/users/8985/ryan-mcgeary for `git diff-tree`.
    #
    # I added -m per the docs - otherwise, you get no output for a pure merge.
    # See https://git-scm.com/docs/git-diff-tree#git-diff-tree--m
    #
    # I added |sort|uniq because -m may yield duplicate outputs for different
    # merge heads.
    #
    # I added the trailing `--` to disambiguate: the provided thing is a rev,
    # not the directory named the same as the rev, which we just created.

for fn in "${filenames[@]}" ; do
    echo "$fn"  # these don't have leading slashes, but are relative to the
                # root of the working directory.
    if [[ $do_grab ]]; then 
        git show "$1":"$fn" | install -D /dev/stdin "$1"/"$fn"
    fi
        # Thanks to https://stackoverflow.com/a/21053077/2877364 by
        # https://stackoverflow.com/users/465183/gilles-quenot for `install` -
        # it creates any missing directories.
done

# vi: set ts=4 sts=4 sw=4 et ai ff=unix: #
