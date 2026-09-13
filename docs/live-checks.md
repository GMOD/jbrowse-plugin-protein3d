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
by basename (the molstar chunk included) and strips the plugin's
subresource-integrity hash from the store manifest. Nothing else is intercepted;
intercepting every request breaks the host (see CLAUDE.md, "Host
compatibility"). Launch Chrome with
`--enable-unsafe-swiftshader --ignore-gpu-blocklist`, or Mol\* gets no WebGL.

Open
`https://jbrowse.org/code/jb2/<host>/?config=/ucsc/hg38/config.json&session=spec-…`
with a `LaunchView-ProteinView` spec, wait for
`[data-testid="protein-view-ready"]`, then read the model back through
`window.JBrowseSession.views`.

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
primary checkout's `.test-jbrowse-nightly`. A regenerated
`test-screenshots/*/09-pdb-search-tab.png` can capture the dialog mid-fade;
don't commit that version.
