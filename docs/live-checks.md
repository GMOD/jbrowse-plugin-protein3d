# Checking a build live on a hosted release

The unit tests hand the model fake entities, `host-compat` proves the bundle
evaluates and the context menu survives, and the e2e drives one nightly zip.
None of them see what a real session does on jbrowse.org, which is where every
protein-browser and hub config runs. The checks that settled the 2026-09 review
were throwaway puppeteer scripts, and the recipe is short enough to rebuild each
time.

## Serve the local build to a hosted release

Copy `serveCandidateBundle` from `scripts/check-demos.mjs`: a CDP `Fetch.enable`
on `*jbrowse-plugin-protein3d*` answers the plugin's own requests from `dist/`
by path (the molstar chunk included) and strips the plugin's
subresource-integrity hash from the store manifest. Nothing else is intercepted;
intercepting every request breaks the host (see CLAUDE.md, "Host
compatibility"). Launch Chrome with `--no-sandbox --disable-setuid-sandbox` and
no GL flag, as the scripts do.

Open
`https://jbrowse.org/code/jb2/<host>/?config=/ucsc/hg38/config.json&session=spec-…`
with a `LaunchView-ProteinView` spec, wait for
`[data-testid="protein-view-ready"]`, then read the model back through
`window.JBrowseSession.views`. The marker waits for a color field's values and
the paint that follows (1.24.0), so a track- or AlphaMissense-colored view reads
ready only once the cartoon shows it; before that it flipped as soon as the
structures were mapped, and a capture 20–40 s later still showed Mol\*'s chain
colors under the right legend.

## Session urls the protein browser would build

Import jb2hubs' `fetchGeneStructure`, `buildSessionUrl` and `pickAlphaFoldModel`
under `node --experimental-strip-types`, with
`scripts/checkProteinLaunches.ts`'s fetch shim (site-relative paths, a browser
user-agent). That reproduces the page's session rather than a hand-written
approximation of it.

## A real hover

Drive it through the same subject the pointer does:
`plugin.behaviors.interaction.hover.next({ current: { loci } })`, with `loci`
built from `view.structures[i].molstarStructure.units[0]` and an atom index from
`residueAtomSegments.offsets`, then read `hoverPosition` and
`hoverGenomeHighlights` back.

## A camera check reads late

Under swiftshader Mol\*'s 250 ms focus animation takes about five seconds, so a
`canvas3d.camera.state.radius` read a few seconds after `protein-view-ready` is
mid-flight and looks like "not framed". Poll until the radius stops moving, or
patch `plugin.managers.camera.focusLoci` in-page and assert on the call.
Measured 2026-09-13: 97 → 85 → 62 → 39 → 16 → 10 over five one-second polls.

## From a worktree

`npx jbrowse` does not resolve in a worktree; use
`npx -y @jbrowse/cli create .test-jbrowse-nightly --nightly`, or copy the
primary checkout's `.test-jbrowse-nightly`. A regenerated dialog capture
(`test-screenshots/*/05-dialog-ready.png`, `09-structure-list-checked.png`) can
catch the dialog mid-fade; don't commit that version.

## The launch dialog

The dialog is a page of its own to check: right-click a gene on a hosted session
(a `LinearGenomeView` spec on `protein3d_config.json`'s GENCODE track), choose
**Launch protein view**, and wait for the structure list to stop saying "Listing
PDB entries" or "Asking AlphaFold DB". Find the gene the way `host-compat`'s
`probeContextMenu` does, by hovering until the display reports
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
