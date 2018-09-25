To copy new text from the en file to another file:

First, grab the en file from the last commit in which the other file
was updated:
git show <commit>:./en/messages.json > en/90dmsgs.json

Then, apply the changes:
git merge-file ru/messages.json en/90dmsgs.json en/messages.json
               ^ File to be changed
                                ^ Base file     ^ Current file

Edit the other file (e.g., ru/messages.json) to clear any conflict
markers (<<<< / >>>>).

Then, check to make sure it looks OK:
git diff --word-diff=color --ignore-space-at-eol --patience -b -w --ignore-blank-lines --no-index en/messages.json ru/messages.json

The only changes you should see are the translations.
