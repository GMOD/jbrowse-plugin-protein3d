---
name: protein-browser-review-2026-09-13
description:
  protein3d reviewed against the jb2hubs protein browser. Sixteen commits landed
  and pushed, not published; open are the browser-facing features (select by
  transcript residue, frame the selection, several ranges, view titles),
  launch-dialog items, and demos.
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

## Open, in the order worth doing

1. **Select by transcript residue.** Add `initialTranscriptResidues` (1-based
   inclusive on `userProvidedTranscriptSequence`), resolved through
   `coordinateMapper` once the alignment exists, clamped to the mapped residues
   inside the range. It is exact for any structure the transcript aligns to, so
   the page can delete `siftsNumbering.ts` and most of its "approximate"
   captions. It stays approximate only where the translation is not UniProt's
   canonical sequence, which the page's map uses.
2. **Frame the selection in 3D.** A session "opened on R248" shows the whole
   fold with R248 out of sight (TP53 on AF-P04637 at 1600×1000). Use
   `plugin.managers.camera.focusLoci(residueLoci(...))`, which reuses
   `applyLociInteractivity.ts`. Run it for a declarative seed only, and after
   `superposeStructures`, whose `PluginCommands.Camera.Reset` would undo it.
   agent-docs/todo.md asks for the same thing as `focusResidue`.
3. **Several ranges at once.** An interface focus lights 30–370 on TP53 because
   `clickedStructureRange` is one range. `selectLabelSeqIds` is already a list,
   and msaview already reads `clickGenomeHighlights` as one. What changes is
   `clickAlignmentRange` and one genome region per run.
4. **Title a snapshot-launched view.** Every protein-browser session shows
   "Untitled view". The page can fix its own sessions today by setting
   `displayName` in `proteinSession.ts`, since that works on every released
   plugin. The plugin fix is a `preProcessSnapshot` default from the feature
   name and `structureDisplayLabel`, which would also collapse the two
   hand-built names in `LaunchProteinViewExtensionPoint/index.ts` and
   `launchViewUtils.ts`.
5. **The spec launch drops settings.** `LaunchView-ProteinView` does not pass
   `showAlignment`, `showProteinTracks`, `compactTracks`, `colorScheme` or
   `autoScrollAlignment` through, and a per-structure `feature` or sequence
   inside `structures[]` is replaced by the top-level one.
6. **Demos.**
   - `docs/demos.md` has no superposition (AF P04637 + mouse P02340), no
     author-numbered residue (`initialResidues` 248 on 1TUP), and no NMR
     ensemble (2L14, twenty models).
   - `harness/App.tsx` deep-links to `jbrowse.org/code/jb2/webgl-poc`, last
     built 2026-07-15, and makes the reader launch by hand; spec launches on
     `main` would open the session directly.
   - The README example is an opaque share link rather than a spec a reader can
     see into.
7. **Launch dialog.**
   - The URL and PDB-id fields fetch on every keystroke (`StructureSourcePicker`
     → `UserProvidedStructure`).
   - The dialog ignores which isoform was right-clicked.
   - `AlphaFoldDBSearch` and `PdbSearch` duplicate the UniProt section, and the
     two copies already disagree.
   - Foldseek reports a 400 or 414 raw for a protein over its length limit.
   - The snapshot `uniprotId` shorthand (`resolveStructureUrl`) still guesses
     `AF-<acc>-F1-model_v6`, because hydration is synchronous.

### Reported by review, traced but not reproduced

- `structureLoader.ts`'s `.catch` does not retry into a swapped plugin, as its
  `.then` does, so a load failing across a remount stays failed.
- A spec-supplied `pairwiseAlignment` is never validated and skips entity
  choice, so `mappedEntity` falls back to entity 1 (a DNA strand in 1TUP).
- `initialResidues` spanning a numbering jump selects the insert:
  `residueRangeToPositions` returns one span from first match to last, so a
  range across 2RH1's receptor loop would include the T4 lysozyme between.
- A click in the Mol\* canvas cannot clear a declared selection, and a click on
  one structure leaves another's selection lit.
- `superposeStructures` indexes `validLocis[i]` but moves `structures[i]`.
- DEVELOPERS.md still says chains score over the chain's length, and omits
  `sideBySide` from the launch table.
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

Items 1 and 2 make the page's "opens on…" sessions do what the card says, and
item 4's page-side half is a one-line fix that needs no release.
