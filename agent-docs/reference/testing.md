# Why the test gates are shaped this way

The commands are in `docs/testing.md` and `docs/host-compatibility.md`; the
rules are in the root `CLAUDE.md` and `test/CLAUDE.md`. This page is the
reasoning.

## The console is asserted, not ignored

- **Unit tests** fail on a `[jbrowse <family> contract]` console line or an
  exception MobX swallowed out of an `autorun` (`test/contractGate.setup.ts`
  installs display-kit's gate). Arming it found the structure tests' stub parent
  had no `color`, so the variant-effect autorun threw on every pass in 65 tests
  while the suite stayed green. A test that provokes a report on purpose takes
  it with `takeContractReports()`.
- **The e2e** asserts `pageComplaintsSince()` empty on every leg. A console line
  is the only place several host incompatibilities have appeared: a bundle
  resolving a re-export the host dropped, a menu contribution throwing inside an
  ErrorBoundary. A `silent: 'passed-only'` once hid a deprecation warning for an
  afternoon.
- `GPU_NOISE` in `scripts/browserConsole.mjs`, shared with `host-compat` and
  `check-demos`, is the one list of what the page may say. It tracks
  `products/jbrowse-capture/src/browser.ts` in jbrowse-components, and a real
  GPU failure (`context LOST`, `GL error`) is not noise.

## `host-compat` measured nothing for a while, twice

- **Intercepting every request.** `page.setRequestInterception(true)` routes the
  whole page through node; the hosts booted the config and sat on "Select a view
  to launch" with `session.views` empty and no console message, while the same
  url in a plain browser opened both views. It printed `ok` because no views
  meant the probe excused `viewReady`. Interception is now scoped to
  `*jbrowse-plugin-protein3d*` through CDP `Fetch.enable` patterns, and an
  unapplied spec fails.
- **`--use-gl=swiftshader` without `--enable-unsafe-swiftshader`** is worse than
  no flag: Chrome deprecated the automatic fallback, so Mol\* got no WebGL
  context on any host, and every run still said `ok` because `viewReady` reads
  load and alignment, not paint. The probe uses
  `--no-sandbox --disable-setuid-sandbox`; a missing context is a console error,
  which now fails.

`host-compat` right-clicks a gene because booting the bundle proves only that it
evaluates, and the declarative launch enters through `LaunchView-ProteinView`.
It asserts the menu carries the host's own rows as well as ours: a plugin that
throws while contributing takes the whole menu down, and asserting only on our
row calls that a missing feature.

## The e2e and its nightly

- `openFeatureContextMenu` hovers across the track container until the display
  reports `featureIdUnderMouse`, then right-clicks that point. The previous
  version right-clicked a constant 10px below the container top, landed one
  pixel past the 10px glyph row, and read exactly like a broken menu.
- The menu resolves the gene with
  `fetchFullFeature(parentId, displayedRegionIndex)`, which re-queries the
  adapter for every CDS record. A 40aa NRAS translation (one CDS of four) came
  from `gff-nostream` 3.0.6–3.0.9 keying GENCODE's shared CDS `ID`, on
  jbrowse-components main from 2026-05-19 to 2026-06-01; seeing it today means a
  stale nightly zip.
- `jbrowse create --nightly` fetches a zip rebuilt without notice, and `pretest`
  (`scripts/ensure-nightly.mjs`) refreshes `.test-jbrowse-nightly` once it is a
  week old. `rm -rf` and recreate to reproduce CI; `curl -sI` the zip url to
  date what CI got, since it has flipped mid-run.
- EBI's proteins API refuses a `HeadlessChrome` user agent with no response at
  all, which the page reports as a CORS failure. The same fetch returns 200
  under an ordinary user agent.

## What a unit test can instantiate

`model.ts` instantiates under vitest with `getSession` mocked (`model.test.ts`).
Test the pure pieces first: each is a factory over a narrow host interface
(`structureLoader`, `structureSuperposer`, `lociChannel`, `frameSelection`,
`connectedHover`, `viewInteractions`, `storedSettings`) that takes observables
or a small MST stand-in. `structureModel` instantiates inside a `types.array`
under a stub parent (`structureModel.test.ts`), with real Mol\* structures from
`test_data/molstarStructure.ts` rather than cast fakes.

AlphaFold's `/api/sequence/summary` nests hits under `structures[].summary` and
its first p53 hit is another species, which is why sequence search gave way to
Foldseek. For what a session does on a hosted release, see
`docs/live-checks.md`.
