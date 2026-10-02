# Host version compatibility

From 0.16 the plugin ships as a code-split ES module and needs JBrowse 5. Hub
configs at permanent urls (`jbrowse.org/ucsc/hg38/config.json`) name it twice:
`storePlugin: "Protein3d"`, which a JBrowse 5 host resolves through the plugin
store to this build, and a UMD `url`, which v4 hosts load instead. v4 hosts keep
the UMD builds already published — 0.15.3 at that url, an older one in the v1
store — and nothing here rebuilds them.

- **Loading.** The bundle externalizes every path the installed `@jbrowse/core`
  ReExports list names. A key the host lacks throws at its first read, naming
  the key, and `PluginLoader` fails the **entire session** — not just this view.
  Booting on hosted `main` is what catches it.
- **Working.** A host API the plugin calls but the host lacks throws at use
  time, and the bundle loads fine. Only a boot on the host catches it.

The alignment runs as a plugin RPC method, `ProteinChooseMappedEntity` and
`ProteinAlignTranscriptToEntity`. The worker loads this plugin from the same url
as the page, so the method is there whenever the view is.

`pnpm host-compat` boots the bundle on hosted builds
(`jbrowse.org/code/jb2/<version>/`, so no `jbrowse create` per version), with a
declarative connected launch and a right-click on a gene. The hosted test config
still names the UMD, so the probe serves it with an `esmUrl` entry instead. It
waits on `[data-testid="protein-view-ready"]` and reports per version whether
the session survived, the plugin registered, the view settled, the context menu
kept the host's own rows, and the console stayed clean. The launch opens 1YCR
beside the AlphaFold model because 1YCR is not identical to the transcript, so
its alignment is the one that goes through the worker; the probe asserts it
lands on the p53 peptide. The probe's CDP interception serves the candidate to
the RPC worker as well as the page (measured 2026-09-25 by marking the served
bundle and reading the mark inside the worker).

```bash
pnpm host-compat             # the published bundle on main
pnpm host-compat:candidate   # dist/ on main
```

Both fail when any probed host fails. `host-compat:candidate` runs in
`preversion`, so a build that breaks the host fails before the tag rather than
after. Add a release to the probe's `DEFAULT_VERSIONS` once JBrowse 5.0.0 is hosted.

For what a session does on jbrowse.org, which neither probe sees,
[live checks](live-checks.md) has the recipe for serving `dist/` to a hosted
release and reading the model back.
