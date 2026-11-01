# Combined preview: every open feature on one site

This branch is a preview only. Each feature still has its own PR. `preview-site/` here is the test site
(branch claude/project-thread-kcjeuf) with every layer applied in this order:

    python3 static-layers/layer-requests/build.py preview-site      # product requests (PR #2)
    python3 static-layers/layer-skindiary/build.py preview-site     # skin progress diary (PR #3)
    python3 static-layers/layer-routine/build.py preview-site       # routine builder (PR #5)
    python3 static-layers/layer-scentfinder/build.py preview-site   # AI scent finder (PR #6)
    python3 static-layers/layer-aiready/build.py preview-site https://skinora-test.vercel.app   # from final-site
    python3 static-layers/layer-aigrowth/build.py preview-site /tmp/aiapi                     # AI search, from final-site
    python3 static-layers/layer-clash/build.py preview-site         # ingredient checker (PR #4)
    python3 static-layers/layer-scrollback/build.py preview-site    # keep scroll position on Back (PR #7)
    python3 static-layers/layer-fixes/build.py preview-site         # routine result text overlap fix

The AI search and ingredient checker server functions (they need npm packages) are left out here, so those
pages use their built-in rules.
