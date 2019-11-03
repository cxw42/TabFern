# lib/SideImage.pm
package SideImage;

use 5.014;
use strict;
use warnings;

use Data::Dumper;
BEGIN { $Data::Dumper::Indent = 1; }

use Statocles::Base 'Class';
with 'Statocles::Plugin';

=head1 NAME

SideImage - Put an image next to a block of text

=head1 SYNOPSIS

After adding this plugin to your site.yml, in a .markdown file:

    % side_image 'image filename' => begin
    Markdown content to put next to the image
    % end

The image filename will be passed to C<< $site->path(...) >>.

=head1 FUNCTIONS

=head2 side_image

Renders the content.

=cut

sub side_image {
    my ($self, $plugin_args, $img, $content) = @_;
        # $plugin_args is a hashref with keys doc, app, site, page.
    my $retval = $plugin_args->{site}->markdown->markdown(
        #"Foo **bold** _italic_ bar\n```\nAnother paragraph\n```"
        "<!-- side_image -->\n" . (Dumper(\@_) =~ s/^/    /gmr) .
        "\n<!-- /side_image -->\n"
    );
    #say STDERR $retval; # DEBUG
    return $retval;
} #side_image()

=head2 register

Register the plugin.  Called automatically.

=cut

sub register {
    my ( $self, $site ) = @_;
    #say STDERR Register => Dumper(\@_);    # DEBUG
    $site->theme->helper( side_image => sub { return $self->side_image(@_) } );
} #register()

1;

__END__

=head1 AUTHOR

Christopher White C<< <cxwembedded@gmail.com> >>

=head1 COPYRIGHT

Copyright (c) 2019 Christopher White.  All rights reserved.

This is free software; you can redistribute it and/or modify it under the same
terms as the Perl 5 programming language system itself.

=cut
