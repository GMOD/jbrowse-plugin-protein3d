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
- **Working.** A host API the plugin calls but an older host lacks throws at use
  time, and the bundle loads fine. Feature-detect rather than assume, as
  `findTrackConf` in `resolveShortLaunch.ts` does.

The same goes for the settings the plugin writes into other views. JBrowse 5
deprecates the `init` key JBrowse 4 used for a LinearGenomeView's launch
settings, but a v4.3.0 LinearGenomeView reads nothing else, so the extension
point checks whether the host's LinearGenomeView declares `init` and writes
whichever shape it takes, so a v5 host sees flat settings and warns about
nothing. The e2e's own test session in `test/setup.ts` still nests its genome
view under `init` so the v4 legs can read it, which is why
`scripts/browserConsole.mjs` excuses v5's deprecation warning until v4 support
goes.

The alignment runs as a plugin RPC method, `ProteinChooseMappedEntity` and
`ProteinAlignTranscriptToEntity`, extending the `RpcMethodType` that the
`@jbrowse/core/pluggableElementTypes` barrel re-exports on every host. v4
workers call `execute(args, driverName)` directly, and main's call `invoke`,
which deserializes first. The methods take plain strings, so neither path has
anything to deserialize, and the same class works on both. The worker loads this
plugin from the same url as the page, so the method is there whenever the view
is.

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
the RPC worker as well as the page (measured 2026-09-25 on v4.0.0, v4.3.0 and
main by marking the served bundle and reading the mark inside the worker).

```bash
pnpm host-compat             # the published bundle on main
pnpm host-compat:candidate   # dist/ on main
```

`host-compat:candidate` runs in `preversion` with `--floor main`, so a build
that breaks the host fails before the tag rather than after. Add a release to
`--versions` once JBrowse 5.0.0 is hosted.

For what a session does on jbrowse.org, which neither probe sees,
[live checks](live-checks.md) has the recipe for serving `dist/` to a hosted
release and reading the model back.
