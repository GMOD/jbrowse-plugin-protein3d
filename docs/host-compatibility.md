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
  A boot on the hosts catches it.
- **Working.** A host API the plugin calls but the host lacks throws at use
  time, and the bundle loads fine. Only a boot on the host catches it.

The oldest host is 5.0.0-beta.12. The UniProt features track paints types it
does not list through the color object's `unknown` member, which beta.12 added;
beta.11's config schema refuses the whole track.

The alignment runs as a plugin RPC method, `ProteinChooseMappedEntity` and
`ProteinAlignTranscriptToEntity`. The worker loads this plugin from the same url
as the page, so the method is there whenever the view is.

`pnpm host-compat` boots the bundle on hosted builds
(`jbrowse.org/code/jb2/<version>/`, so no `jbrowse create` per version), with a
declarative connected launch and a right-click on a gene. By default it probes
the oldest supported host (`v5.0.0-beta.12`), the newest v5 release on npm
(`latest`, skipped until jbrowse.org hosts it) and `main`; `--versions` takes
any list of those names. The probe serves the hosted test config with an
`esmUrl` entry naming the store's `latest/` build, which `--bundle` replaces. It
waits on `[data-testid="protein-view-ready"]` and reports per version whether
the session survived, the plugin registered, the view settled, the context menu
kept the host's own rows, and the console stayed clean. The launch opens 1YCR
beside the AlphaFold model because 1YCR is not identical to the transcript, so
its alignment is the one that goes through the worker; the probe asserts it
lands on the p53 peptide. The probe's CDP interception serves the candidate to
the RPC worker as well as the page (measured 2026-09-25 by marking the served
bundle and reading the mark inside the worker).

```bash
pnpm host-compat             # the published bundle
pnpm host-compat:candidate   # dist/
```

Both fail when any probed host fails. `host-compat:candidate` runs in
`preversion` and CI, so a build that breaks a host fails before the tag rather
than after. A change to the oldest supported host changes the probe's
`OLDEST_SUPPORTED` too.

For what a session does on jbrowse.org, which neither probe sees,
[live checks](live-checks.md) has the recipe for serving `dist/` to a hosted
release and reading the model back.
