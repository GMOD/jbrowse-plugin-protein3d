# Testing

Every host outage so far passed tsc and eslint, so the suites that matter most
boot the built bundle in a real browser and fail on anything the page logs at
warn or error.

| Command            | What it checks                                                                       |
| ------------------ | ------------------------------------------------------------------------------------ |
| `pnpm test`        | Unit tests plus the e2e suite on a nightly JBrowse                                   |
| `pnpm test:docs`   | The session-spec examples in [launching](launching.md)                               |
| `pnpm check-demos` | Every link in [demos](demos.md) against its expected mapping                         |
| `pnpm host-compat` | The plugin on hosted JBrowse releases, see [host compatibility](#host-compatibility) |

`pnpm test:docs` starts `pnpm start` itself if nothing is listening on :9000,
and the `Daily` workflow runs it, so a dead AlphaFold URL or a broken launch
path shows up as a failed nightly rather than as a bug report.

## The E2E suite

`test/plugin.test.ts` drives a real `jbrowse create` instance with the built ESM
bundle (`pnpm vitest run test/plugin.test.ts`; `SKIP_BUILD=1` reuses `dist/`).
It clicks all the way through: right-click a gene → `Launch › Protein view...` →
wait for the dialog to finish resolving → Launch → molstar draws the structure.

Every step asserts. There is no logged-and-continue path, because a suite that
returns early on "no menu items" passes green against a bundle that error-pages
the whole app — which is exactly what it did before. In particular:

- the plugin has to be registered (a bundle that throws never registers),
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
menu. `pnpm test` refreshes the nightly zip in `.test-jbrowse-nightly` once the
copy is a week old, so a local copy can trail CI's by up to seven days. When a
nightly leg fails, check its date before your diff.

## Screenshots

The E2E suites write reference PNGs under `test-screenshots/`. A failing run
writes its captures to `test-screenshots/failed/<version>/` (gitignored) instead
of over the committed references, so a broken run never promotes pictures of the
broken app to the new baseline. puppeteer captures aren't pixel-deterministic
(antialiasing, WebGL, font hinting), so `scripts/pngSnapshot.mjs` normalizes
each capture through `pngquant --nofs` and only overwrites a committed PNG when
more than ~1% of pixels differ. Tune the threshold with `SCREENSHOT_DIFF_RATIO`
(`0` always rewrites, `0.05` tolerates larger wobble). `pngquant` is optional;
without it the raw PNG is used.

## What none of these see

What a protein-browser or hub session does on jbrowse.org is outside every suite
here. [Live checks](#live-checks) has the recipe for serving `dist/` to a hosted
release and reading the model back.

## Host compatibility

From 0.16 the plugin ships as a code-split ES module and needs JBrowse 5. Hub
configs at permanent urls (`jbrowse.org/ucsc/hg38/config.json`) name it twice:
`storePlugin: "Protein3d"`, which a JBrowse 5 host resolves through the plugin
store to this build, and a UMD `url`, which v4 hosts load instead. v4 hosts keep
the UMD builds already published — 0.15.3 at that url, an older one in the v1
store — and nothing here rebuilds them.

- **Loading.** The bundle binds every path the installed `@jbrowse/core`
  re-exports through core's `hostShim`, which fails the build on a name that
  core does not serve. `pnpm check-host-floor` builds against what
  v5.0.0-beta.12, the oldest supported host, serves. A name the running host
  lacks throws when called, naming the export; a throw while the bundle
  evaluates makes `PluginLoader` fail the **entire session**, not just this
  view. A boot on the hosts catches it.
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
than after. The oldest supported host is `OLDEST_SUPPORTED_HOST` in
`scripts/hostFloor.mjs`, which both the probe and `check-host-floor` read, so
raising it moves both.

For what a session does on jbrowse.org, which neither probe sees,
[live checks](#live-checks) has the recipe for serving `dist/` to a hosted
release and reading the model back.

## Live checks

The unit tests hand the model fake entities, `host-compat` proves the bundle
evaluates and the context menu survives, and the e2e drives one nightly zip.
None of them see what a real session does on jbrowse.org, which is where every
protein-browser and hub config runs. The checks that settled the 2026-09 review
were throwaway puppeteer scripts, and the recipe is short enough to rebuild each
time.

### Serve the local build to a hosted release

Copy `serveCandidateBundle` from `scripts/check-demos.mjs`: a CDP `Fetch.enable`
on `*jbrowse-plugin-protein3d*` answers the plugin's own requests from `dist/`
by path (the molstar chunk included) and strips the plugin's
subresource-integrity hash from the store manifest. Nothing else is intercepted;
intercepting every request breaks the host (see
`agent-docs/reference/testing.md`). Launch Chrome with
`--no-sandbox --disable-setuid-sandbox` and no GL flag, as the scripts do.

Open
`https://jbrowse.org/code/jb2/<host>/?config=/ucsc/hg38/config.json&session=spec-…`
with a `LaunchView-ProteinView` spec, wait for
`[data-testid="protein-view-ready"]`, then read the model back through
`window.JBrowseSession.views`. The marker waits for a color field's values and
the paint that follows (1.24.0), so a track- or AlphaMissense-colored view reads
ready only once the cartoon shows it; before that it flipped as soon as the
structures were mapped, and a capture 20–40 s later still showed Mol\*'s chain
colors under the right legend.

### Session urls the protein browser would build

Import jb2hubs' `fetchGeneStructure`, `buildSessionUrl` and `pickAlphaFoldModel`
under `node --experimental-strip-types`, with
`scripts/checkProteinLaunches.ts`'s fetch shim (site-relative paths, a browser
user-agent). That reproduces the page's session rather than a hand-written
approximation of it.

### A real hover

Drive it through the same subject the pointer does:
`plugin.behaviors.interaction.hover.next({ current: { loci } })`, with `loci`
built from `view.structures[i].molstarStructure.units[0]` and an atom index from
`residueAtomSegments.offsets`, then read `hoverPosition` and
`hoverGenomeHighlights` back.

### A camera check reads late

Under swiftshader Mol\*'s 250 ms focus animation takes about five seconds, so a
`canvas3d.camera.state.radius` read a few seconds after `protein-view-ready` is
mid-flight and looks like "not framed". Poll until the radius stops moving, or
patch `plugin.managers.camera.focusLoci` in-page and assert on the call.
Measured 2026-09-13: 97 → 85 → 62 → 39 → 16 → 10 over five one-second polls.

### From a worktree

`npx jbrowse` does not resolve in a worktree; use
`npx -y @jbrowse/cli create .test-jbrowse-nightly --nightly`, or copy the
primary checkout's `.test-jbrowse-nightly`. A regenerated dialog capture
(`test-screenshots/*/05-dialog-ready.png`, `09-structure-list-checked.png`) can
catch the dialog mid-fade; don't commit that version.

### The launch dialog

The dialog is a page of its own to check: right-click a gene on a hosted session
(a `LinearGenomeView` spec on `protein3d_config.json`'s GENCODE track), choose
**Launch › Protein view...**, and wait for the structure list to stop saying
"Listing PDB entries" or "Asking AlphaFold DB". Find the gene the way
`host-compat`'s `probeContextMenu` does, by hovering until the display reports
`featureIdUnderMouse`. Checking rows is a click on
`[data-testid="structure-row-<key>"]` (`alphafold`, `pdb:9btm`, `complex:AF-…`).
Measure Launch at a 1280×900 viewport: the tab bounds its own height, so
`[data-testid="protein-launch-button"]` should sit inside the window with the
UniProt chooser open or closed. To see one source fail without the rest, answer
only its requests with a 503 through the same CDP `Fetch.enable` that serves
`dist/`: a POST whose body holds `entries(entry_ids` is the partners-and-ligands
lookup, one to `sequence-coordinates.rcsb.org` the entry list.

Opening the dialog on a gene AlphaFold DB has no complex for logs one console
error, the 404 from `/api/complex/<accession>` that answers "none" (TP53 and
OR4F5 both, 2026-11-05). It is the browser's own resource-load line, which no
code can quiet; NRAS has complexes, so the e2e does not see it.
