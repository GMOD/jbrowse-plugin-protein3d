# Developing jbrowse-plugin-protein3d

For launching views from URLs or code, see
[docs/launching.md](docs/launching.md) and
[docs/session-snapshots.md](docs/session-snapshots.md). This page covers
building, testing and releasing the plugin itself.

## Running locally

```bash
pnpm install
pnpm start
```

`pnpm start` rebuilds on change and serves the repo on `http://localhost:9000`;
`config.json` loads the plugin from there, so point a JBrowse instance at
`http://localhost:9000/config.json`.

The genome↔structure mapping — the aligner, chain choice, SIFTS, the AlphaFold
and PDBe lookups — lives in the
[`p2s_mapper`](https://github.com/GMOD/p2s_mapper) package, which the plugin
bundles. A change to those rules is made and tested there. [harness/](harness/)
runs that code on real structures without JBrowse.

## Tests

| Command            | What it checks                                                            |
| ------------------ | ------------------------------------------------------------------------- |
| `pnpm test`        | Unit tests plus the e2e suite on a nightly JBrowse                        |
| `pnpm test:docs`   | The session-spec examples in [docs/launching.md](docs/launching.md)       |
| `pnpm check-demos` | Every link in [docs/demos.md](docs/demos.md) against its expected mapping |
| `pnpm host-compat` | The plugin on hosted JBrowse releases, see below                          |

`pnpm test:docs` starts `pnpm start` itself if nothing is listening on :9000,
and the `Daily` workflow runs it, so a dead AlphaFold URL or a broken launch
path shows up as a failed nightly rather than as a bug report.

### The E2E suite

`test/plugin.test.ts` drives a real `jbrowse create` instance with the built umd
bundle (`TEST_JBROWSE_VERSION=<version> pnpm vitest run test/plugin.test.ts`;
`SKIP_BUILD=1` reuses `dist/`). It clicks all the way through: right-click a
gene → `Launch protein view` → wait for the dialog to finish resolving → Launch
→ molstar draws the structure.

Every step asserts. There is no logged-and-continue path, because a suite that
returns early on "no menu items" passes green against a bundle that error-pages
the whole app — which is exactly what it did before. In particular:

- the umd global has to exist (a bundle that throws never defines it),
- the context menu has to contain the plugin's item,
- `Launch` has to become enabled, and the molstar canvas has to end up with
  actual pixels drawn — the container mounts ~5s before the structure appears,
  so waiting on the container alone screenshots an empty viewer,
- the session's structure has to be aligned, with its genome→protein mapping
  covering the whole translated transcript,
- the page has logged nothing at warn or error beyond the known entries in
  `scripts/browserConsole.mjs`.

The suite asserts the mapping is consistent with whatever transcript arrived
rather than pinning a length, because hosts differ in what they hand the context
menu. `pnpm test` fetches the nightly zip into `.test-jbrowse-nightly` only when
that directory is missing, so a local copy freezes at whatever `main` was the
day it was made. When a nightly leg fails, check its date before your diff.

### Screenshots

The E2E suites write reference PNGs under `test-screenshots/`. A failing run
writes its captures to `test-screenshots/failed/<version>/` (gitignored) instead
of over the committed references, so a broken run never promotes pictures of the
broken app to the new baseline. puppeteer captures aren't pixel-deterministic
(antialiasing, WebGL, font hinting), so `scripts/pngSnapshot.mjs` normalizes
each capture through `pngquant --nofs` and only overwrites a committed PNG when
more than ~1% of pixels differ. Tune the threshold with `SCREENSHOT_DIFF_RATIO`
(`0` always rewrites, `0.05` tolerates larger wobble). `pngquant` is optional;
without it the raw PNG is used.

## Host version compatibility

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

For what a session does on jbrowse.org, which none of these see,
[docs/live-checks.md](docs/live-checks.md) has the recipe for serving `dist/` to
a hosted release and reading the model back.

## Publishing

```bash
pnpm version patch
```

`preversion` waits for green CI, lints, builds and boots the bundle on hosted
JBrowse releases; `postversion` pushes the tag, and CI publishes to npm and
writes the GitHub release from `CHANGELOG.md`.
