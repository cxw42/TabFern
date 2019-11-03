# TabFern `statocles` branch

This is the [Statocles](https://metacpan.org/pod/Statocles) configuration
for the TabFern web site.

# Running `statocles`

    make build  # build into .statocles/build
    make        # build, and start a local server running

# Debugging

Templates:

    MOJO_TEMPLATE_DEBUG=1 make build 2>&1|less

