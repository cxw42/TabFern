# Makefile for tabfern, by cxw

# Handmade bundles.
# NOTE: keep these in sync with the lists in conf/require-config.js
# For src/view/main and src/view/tree
TO_BUNDLE_1 = \
	   tabfern/js/jquery.js \
	   tabfern/js/loglevel.js
DEST_BUNDLE_1 = tabfern/src/view/bundle_common.js

# For src/view/tree
TO_BUNDLE_2= \
	   tabfern/js/jstree.js \
	   tabfern/js/jstree-actions.js \
	   tabfern/js/jstree-flagnode.js \
	   tabfern/js/jstree-because.js \
	   tabfern/js/jstree-multitype.js \
	   tabfern/js/jstree-redraw-event.js \
	   tabfern/js/multidex.js \
	   tabfern/js/justhtmlescape.js \
	   tabfern/js/signals.js \
	   tabfern/js/asynquence.js \
	   tabfern/js/asynquence-contrib.js \
	   tabfern/js/asq-helpers.js \
	   tabfern/js/rmodal.js \
	   tabfern/js/tinycolor.js \
	   tabfern/js/keypress.js \
	   tabfern/js/hamburger.js \
	   tabfern/js/import-file.js \
	   tabfern/js/export-file.js

DEST_BUNDLE_2 = tabfern/src/view/bundle_tree.js

.PHONY: all bundle clean

all: bundle
	./check-webstore.sh

bundle: $(DEST_BUNDLE_1) $(DEST_BUNDLE_2)

$(DEST_BUNDLE_1): $(TO_BUNDLE_1) bundle.sh Makefile
	./bundle.sh $@ $(TO_BUNDLE_1)

$(DEST_BUNDLE_2): $(TO_BUNDLE_2) bundle.sh Makefile
	./bundle.sh $@ $(TO_BUNDLE_2)

clean:
	-rm $(DEST_BUNDLE_1) $(DEST_BUNDLE_2)

