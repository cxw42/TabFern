.PHONY: all build serve

all:
	$(MAKE) build
	$(MAKE) serve

build:
	export PERL5LIB="lib:$$PERL5LIB" ; statocles build

serve:
	export PERL5LIB="lib:$$PERL5LIB" ; statocles daemon
