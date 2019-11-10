# lib/OffsetAnchor.pm
package OffsetAnchor;

use 5.014;
use strict;
use warnings;

# Debugging
use Data::Dumper;
sub _d { Data::Dumper->new(\@_)->Indent(1)->Dump }
my $VERBOSE = 0;
sub vlog { STDERR->say(@_) if $VERBOSE }

use Statocles::Base 'Class';
with 'Statocles::Plugin';

use Carp qw(croak);

=head1 NAME

OffsetAnchor - a named anchor with a vertical offset

=head1 SYNOPSIS

In C<site.yml>:

    site:
        args:
            plugins:
                offset_anchor:
                    $class: OffsetAnchor

In a C<.markdown> file:

    %= offset_anchor 'anchor_name'

=head1 FUNCTIONS

=head2 offset_anchor

Renders the anchor.

=cut

sub offset_anchor {
    vlog 'side_image: ', _d(@_);
    my ($self, $render_args, $anchor_name) = @_;
        # $render_args is a hashref with keys doc, app, site, page, ...

    croak "Anchor name cannot be a begin..end block" if ref $anchor_name eq 'CODE';
    vlog "Anchor name: >>>$anchor_name<<<";

    my $retval = <<EOT;
<div class="offset_anchor">
<a name="$anchor_name">&nbsp;</a>
</div>
EOT
    vlog 'Retval: ', ref($retval), " >>>$retval<<<";
    return $retval;
} #offset_anchor()

=head2 register

Register the plugin.  Called automatically.

=cut

sub register {
    my ( $self, $site ) = @_;
    vlog Register => _d(@_);
    $site->theme->helper( offset_anchor => sub { return $self->offset_anchor(@_) } );
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
