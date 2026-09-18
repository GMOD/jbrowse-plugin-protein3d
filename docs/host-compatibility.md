# Host version compatibility

Hub configs at permanent urls (`jbrowse.org/ucsc/hg38/config.json`) name this
plugin, and desktop installs and published links keep opening them on whatever
JBrowse they have. So the published bundle has to work on hosts much older than
the one we develop against, and there are two separate floors:

- **Loading.** The bundle externalizes a module only when every host in
  `scripts/host-reexports.json` re-exports it. A host missing one leaves
  `JBrowseExports["mod"]` undefined, the UMD global is never defined, and
  `PluginLoader`'s `Promise.all` fails the **entire session** — not just this
  view. `pnpm check-host-externals` greps the built bundle to confirm.
- **Working.** A host API the plugin calls but an older host lacks throws at use
  time. This floor moves silently: a single `session.getTracksById()` call held
  the declarative launch at `v4.2.0` while the bundle loaded fine seven releases
  earlier. Feature-detect rather than assume, as `findTrackConf` in
  `resolveShortLaunch.ts` does.

The same goes for the settings the plugin writes into other views. JBrowse 5
deprecates the `init` key JBrowse 4 used for a LinearGenomeView's launch
settings, but a v4.3.0 LinearGenomeView reads nothing else, so the extension
point checks whether the host's LinearGenomeView declares `init` and writes
whichever shape it takes, so a v5 host sees flat settings and warns about
nothing. The e2e's own test session in `test/setup.ts` still nests its genome
view under `init` so the v4 legs can read it, which is why
`scripts/browserConsole.mjs` excuses v5's deprecation warning until v4 support
goes.

`pnpm host-compat` boots the bundle on hosted releases
(`jbrowse.org/code/jb2/<version>/`, so no `jbrowse create` per version), with a
declarative connected launch and a right-click on a gene. It waits on
`[data-testid="protein-view-ready"]` and reports per version whether the session
survived, the global appeared, the view settled, the context menu kept the
host's own rows, and the console stayed clean.

```bash
pnpm host-compat                              # the published bundle, v2.15.0 to main
pnpm host-compat:candidate                    # dist/ on v4.0.0, v4.3.0, latest, main
pnpm host-compat -- --versions v3.7.0,latest  # narrow it
```

`host-compat:candidate` runs in `preversion` with `--floor v4.0.0`, so a build
that breaks a supported host fails before the tag rather than after.

For what a session does on jbrowse.org, which neither probe sees,
[live checks](live-checks.md) has the recipe for serving `dist/` to a hosted
release and reading the model back.
