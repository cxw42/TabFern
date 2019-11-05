# lib/SideImage.pm
package SideImage;

use 5.014;
use strict;
use warnings;

use Data::Dumper;
BEGIN { $Data::Dumper::Indent = 1; }

use Statocles::Base 'Class';
with 'Statocles::Plugin';

use Carp qw(croak);
use Mojo::ByteStream;

=head1 NAME

SideImage - Put an image next to a block of text

=head1 SYNOPSIS

In C<site.yml>:

    site:
        args:
            plugins:
                side_image:
                    $class: SideImage
                    $args:
                        template: site/whatever.html

In a C<.markdown> file:

    % side_image 'image filename' => begin
    Markdown content to put next to the image
    % end

The C<image filename> is used as-is.  You can provide the result of
a C<< $site->url(...) >> call to get a full URL, but that can interfere
with local testing.

=head1 ATTRIBUTES

=head2 template

The template filename to use for rendering.  Relative to the theme.
Does not include the C<.ep> extension.

=cut

has template => (
    is => 'ro',
    isa => Str,
    required => 1
);

=head1 FUNCTIONS

=head2 side_image

Renders the content.  Passes to the L</template>:

=over

=item C<$image>

The path to the specified image

=item C<$content>

The content for the left side

=item Others

C<$doc>, C<$app>, C<$site>, and C<$page>

=back

=cut

sub side_image {
    #say STDERR 'side_image: ', Dumper(\@_);     # DEBUG
    my ($self, $render_args, $img, $content) = @_;
        # $render_args is a hashref with keys doc, app, site, page, ...

$DB::single=1;
    my $template = $render_args->{site}->theme->read($self->{template})
        or croak "No template";

    eval { $content = $content->(); };      # In case it's a begin...end block
    #say STDERR "Content: >>>$content<<<";

    my $retval = $template->render(
        image => $img,
        content => $content,
        map {; $_ => $render_args->{$_} } qw(app doc site page)
    );
    croak "No rendered output" unless defined $retval;

    #my $retval = $render_args->{site}->markdown->markdown(
    #    #"Foo **bold** _italic_ bar\n```\nAnother paragraph\n```"
    #    "<!-- side_image -->\n" . (Dumper(\@_) =~ s/^/    /gmr) .
    #    "\n<!-- /side_image -->\n"
    #);
    $retval = Mojo::ByteStream->new($retval);
    #say STDERR 'Retval: ', ref($retval), " >>>$retval<<<"; # DEBUG
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
