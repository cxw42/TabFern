.PHONY: all build serve

PORT ?= 3000

all: serve

build:
	export PERL5LIB="lib:$$PERL5LIB" ; statocles build

serve:
	export PERL5LIB="lib:$$PERL5LIB" ; statocles daemon -p $(PORT)

help:
	@echo 'Valid targets are: all build serve'
	@echo 'The "serve" target also builds the site.'
	@echo 'Give a value to PORT to specify a port for the daemon.'
