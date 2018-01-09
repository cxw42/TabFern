# Makefile for tabfern, by cxw

# A hand-made bundle for use in the src/view tree.
# NOTE: keep this in sync with the list in conf/require-config.js
TO_BUNDLE= \
	   tabfern/js/jquery.js \
	   tabfern/js/jstree.js \
	   tabfern/js/jstree-actions.js \
	   tabfern/js/jstree-flagnode.js \
	   tabfern/js/jstree-because.js \
	   tabfern/js/jstree-multitype.js \
	   tabfern/js/jstree-redraw-event.js \
	   tabfern/js/loglevel.js \
	   tabfern/js/multidex.js \
	   tabfern/js/justhtmlescape.js \
	   tabfern/js/signals.js \
	   tabfern/js/asynquence.js \
	   tabfern/js/asynquence-contrib.js \
	   tabfern/js/asq-helpers.js \
	   tabfern/js/rmodal.js \
	   tabfern/js/tinycolor.js \
	   tabfern/js/keypress.js \
	   tabfern/js/hamburger.js 

DEST_BUNDLE = tabfern/src/view/generated_bundle.js

all: $(DEST_BUNDLE)
	./check-webstore.sh

bundle: $(DEST_BUNDLE)

$(DEST_BUNDLE): $(TO_BUNDLE)
	cat $^ > $@


