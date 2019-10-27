# Serve this directory as a static site using plackup(1).
# Thanks to Gabor Szabo, 
# https://perlmaven.com/serving-static-site-using-plack-psgi .
# To install dependencies using cpanm 
# (https://metacpan.org/pod/distribution/App-cpanminus/lib/App/cpanminus/fatscript.pm):
#   cpanm Plack Plack::Builder Plack::App::File Plack::Middleware::DirIndex
use strict;
use warnings;
 
use Plack::Builder;
 
use Plack::App::File;
my $app = Plack::App::File->new(root => ".")->to_app;
 
builder {
      enable "DirIndex", dir_index => 'index.html';
      $app;
}
