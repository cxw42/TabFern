.PHONY: all serve

all:
	statocles build && statocles daemon

serve:
	statocles daemon
