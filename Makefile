# makefile for Jekyll site
# Based on https://github.com/jekyll/jekyll/issues/332#issuecomment-18952908
# by https://github.com/mjswensen

all:
	@echo 'Targets: build (to _site)'
	@echo '         deploy (to ../gh_pages)'
	@echo '         test (to serve via localhost:4000)'

build:
	time bundle exec jekyll b

deploy:
	time bundle exec jekyll b -d ../gh-pages

test:
	sh -c 'time bundle exec jekyll serve --baseurl ""'

