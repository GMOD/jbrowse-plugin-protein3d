---
name: protein-browser-review-2026-09-13
description:
  protein3d reviewed against the jb2hubs protein browser. Twenty commits landed,
  not published; the transcript-residue seed, camera framing, default titles and
  spec settings are in. Open are several ranges at once, launch-dialog items,
  and demos.
---

# protein3d against the protein browser: where things stand after 2026-09-13

Point-in-time. The durable reasoning is in [CLAUDE.md](../../CLAUDE.md) (two new
sections: "An MSA reaches a structure through the genome" and "Everything on one
Mol\* plugin hears everything") and in jb2hubs' `agent-docs/PROTEIN_BROWSER.md`,
which describes the page. This file holds only what is open, in the order it is
worth doing; delete it once that is filed or done.

## What changed, in one paragraph

Three review agents read the plugin against the sessions the protein browser
builds (`website/src/components/proteinSession.ts`, `ProteinLaunchCard.tsx`),
and every finding acted on was reproduced first, most of them live on a session
generated with the page's own code. Sixteen commits fix hover leaking between
superposed structures, one structure's selection wiping another's, an MSA hover
lighting the wrong codon, a ready marker that fired before the structure loaded,
a pLDDT track on crystal B-factors, and a stored preference being overwritten.
In the launch dialog they delete a broken AlphaFold sequence search, resolve
AlphaFold models through the prediction API, and fix three Foldseek bugs. A
fresh-context review of the finished diff found three regressions in those
commits, and `a599c5c`/`e0bc736` fix them.

| change                                                         | commit               |
| -------------------------------------------------------------- | -------------------- |
| ready marker and `showLoading` wait for load, alignment, SIFTS | `3fa2e33`            |
| a Mol\* interaction acts only on its own structure (model id)  | `e94cb9e`, `a599c5c` |
| selection and highlight set for all structures at once         | `49cc0dd`            |
| MSA ↔ structure through the codon; `connectedMsaViewId` gone   | `137bb13`            |
| only a menu toggle stores a setting                            | `019a2d7`            |
| no pLDDT track for an experimental entry                       | `746d992`, `a599c5c` |
| tests parse real Mol\* structures instead of casting fakes     | `57bb219`            |
| AlphaFold sequence search deleted                              | `d73debc`            |
| Foldseek PDB hits, launch sequence, frozen New search          | `b374667`            |
| AlphaFold models from `/api/prediction/<acc>`                  | `0fadaba`, `e0bc736` |
| e2e helper scrolls the viewer into view                        | `c827c15`            |
| CLAUDE.md seams                                                | `9992ac4`            |

## Not published, which is the step that reaches users

`latest` in the plugin store is still 0.11.0, and every protein-browser session
and hub config loads `latest`, so none of this is visible yet. Publish with
`pnpm version patch`, then
`pnpm update-plugins && pnpm upload && pnpm invalidate` in
`~/src/jbrowse-plugin-list`. `preversion` runs `check-ci` and
`host-compat:candidate`.

Before landing, the branch passed build, lint, 307 unit tests,
`host-compat:candidate` on v4.0.0, v4.3.0, latest and main, `check-demos` (all
five), and both e2e legs locally. CI on `9992ac4` failed two jobs:

- **Spell check**, which has failed on every push since `2955c55` wrote `MT-ND2`
  into `docs/genome-to-structure-alignment.md`. `6eb81c4` adds `ND` to
  `_typos.toml`.
- **E2E nightly**, multi-structure leg: `Navigation timeout of 60000 ms` in
  `openSessionSpec`'s `waitUntil: 'networkidle2'`, after the page had booted. A
  re-run of the same commit passed, as had `ff03d67` in CI and three local runs,
  so it was flake. If it recurs, look for a request that never settles during
  the three-structure spec launch.

## Done since, 2026-09-13 afternoon (four commits, landed, not published)

- **Select by transcript residue**: `initialTranscriptResidues`, resolved
  through the alignment once the structure settles and clamped to the modeled
  residues (`transcriptRangeToStructureRange`). Verified live on `main`: 248 on
  AF-P04637 + 1TUP lands at position 247; 1–120 on 1TUP alone clamps to
  positions 0–27 (author 94–120). The page can now send the domain map's own
  numbering and drop `siftsNumbering.ts`; it stays approximate only where the
  translation is not the canonical sequence the map counts on.
- **Frame the selection in 3D**: `frameSelection.ts` focuses the camera on the
  seeded residues once every structure has settled and superposed, once per
  plugin, seeds only. On 1TUP alone the radius went 59 → 31 (R248 on all three
  chains); on AF + 1TUP, 97 → 10 after the superposition's reset. The first cut
  marked the plugin framed before the seed had resolved, because SIFTS settles
  the structure and resolves the seed in one change; `bd509cb` fixes that.
- **Title a snapshot-launched view**: the view's `preProcessSnapshot` fills
  `displayName` from the transcript and structure labels (`defaultDisplayName`);
  the extension point's hand-built name is gone, the dialog's `formatViewName`
  stays since it knows the gene name.
- **The spec launch passes settings through**, and a structure inside
  `structures[]` keeps its own `feature`, sequence and `connectedViewId`.
- Of the traced-not-reproduced list: `superposeStructures` pairs each loci with
  its cell; the loader's `.catch` retries into a swapped plugin; DEVELOPERS.md
  says "shorter of transcript and chain" and lists `sideBySide`.

## Open, in the order worth doing

1. **Several ranges at once.** An interface focus lights 30–370 on TP53 because
   `clickedStructureRange` is one range. `selectLabelSeqIds` is already a list,
   and msaview already reads `clickGenomeHighlights` as one. What changes is
   `clickAlignmentRange` (read by `ProteinAlignment.tsx` and `SplitString.tsx`),
   `FeatureBar.tsx`, and one genome region per run. Not done on 2026-09-13
   because the page has no way to send several ranges yet, so it needs a spec
   shape (`initialTranscriptResidues: [...]`) agreed with the page first.
2. **Demos.**
   - `docs/demos.md` has no superposition (AF P04637 + mouse P02340), no
     author-numbered residue (`initialResidues` 248 on 1TUP), and no NMR
     ensemble (2L14, twenty models).
   - `harness/App.tsx` deep-links to `jbrowse.org/code/jb2/webgl-poc`, last
     built 2026-07-15, and makes the reader launch by hand; spec launches on
     `main` would open the session directly.
   - The README example is an opaque share link rather than a spec a reader can
     see into.
3. **Launch dialog.**
   - The URL and PDB-id fields fetch on every keystroke (`StructureSourcePicker`
     → `UserProvidedStructure`).
   - The dialog ignores which isoform was right-clicked.
   - `AlphaFoldDBSearch` and `PdbSearch` duplicate the UniProt section, and the
     two copies already disagree.
   - Foldseek reports a 400 or 414 raw for a protein over its length limit.
   - The snapshot `uniprotId` shorthand (`resolveStructureUrl`) still guesses
     `AF-<acc>-F1-model_v6`, because hydration is synchronous.

### Reported by review, traced but not reproduced

- A spec-supplied `pairwiseAlignment` is never validated and skips entity
  choice, so `mappedEntity` falls back to entity 1 (a DNA strand in 1TUP).
- `initialResidues` spanning a numbering jump selects the insert:
  `residueRangeToPositions` returns one span from first match to last, so a
  range across 2RH1's receptor loop would include the T4 lysozyme between.
  `initialTranscriptResidues` has the same shape (min..max of the mapped
  positions), which a fusion's unmapped partner keeps out of only because those
  positions no longer map.
- A click in the Mol\* canvas cannot clear a declared selection, and a click on
  one structure leaves another's selection lit.
- The feature-track label column truncates to "Doma…", "Bind…" at 45 px (visible
  in any PDB-entry screenshot).

## Leads already chased, so they are not chased again

- **An explicit MSA link.** Nothing ever set `connectedMsaViewId`, msaview never
  read it, and both plugins pair by shared `connectedViewId`, so `137bb13`
  removed it. Don't re-add it: an MSA hover means a residue only through the
  transcript, which the genome view already carries.
- **AlphaFold's `/api/sequence/summary`** now nests under
  `structures[].summary`, and its first p53 hit is another species
  (AF-A0A2R9A5P4). The mode is deleted, and Foldseek covers searching by
  sequence.
- **Model ids survive superposition.** `TransformStructureConformation` builds
  units with `applyOperator`, which keeps `unit.model`. Symmetry assemblies do
  the same.
- **`model.ts` will not instantiate under vitest**: `@mui/icons-material` needs
  `@emotion/styled`, which the plugin leaves to the host. Test the pure pieces
  (`storedSettings`, `lociChannel`, `connectedHover`) instead.
- **The e2e multi-structure failure after `3fa2e33` was the helper**, which
  measured the canvas without scrolling it into view. It had passed only on the
  early ready marker.
- **`test-screenshots/v4.3.0/09-pdb-search-tab.png`** can capture the dialog
  mid-fade. Don't commit that version.

## If you pick this up

The live checks that settled each bug were throwaway scripts, and the recipe is
short enough to rebuild:

- **Session urls.** Import jb2hubs' `fetchGeneStructure`, `buildSessionUrl` and
  `pickAlphaFoldModel` under `node --experimental-strip-types`, with
  `scripts/checkProteinLaunches.ts`'s fetch shim (site-relative paths, a browser
  user-agent).
- **Local build.** Serve `dist/` in place of the published plugin through CDP
  `Fetch.enable`, as `check-demos.mjs`'s `serveCandidateBundle` does. Launch
  Chrome with `--enable-unsafe-swiftshader --ignore-gpu-blocklist`, or Mol\*
  gets no WebGL.
- **A real hover.** Drive it through the same subject the pointer does:
  `plugin.behaviors.interaction.hover.next({ current: { loci } })`, with `loci`
  built from `view.structures[i].molstarStructure.units[0]`, an atom index from
  `residueAtomSegments.offsets`, then read `hoverPosition` and
  `hoverGenomeHighlights` back.
- **Worktree e2e.** `npx jbrowse` does not resolve in a worktree; use
  `npx -y @jbrowse/cli create .test-jbrowse-nightly --nightly`.

- **A camera check reads late.** Under swiftshader Mol\*'s 250 ms focus
  animation takes about five seconds, so a camera radius read a few seconds
  after `protein-view-ready` is mid-flight. Poll `canvas3d.camera.state.radius`
  until it stops moving, or patch `managers.camera.focusLoci` to log the call.

Once this ships, the page's "opens on…" sessions should send
`initialTranscriptResidues` in the map's own numbering instead of translating
through SIFTS.
