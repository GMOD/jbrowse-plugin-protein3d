# Protein3D — next-steps plan

Working roadmap for refactors and features. Ordered by leverage. The recurring
methodology is **safety net first**: before changing risky logic, write
characterization tests that pin current behavior, then refactor against them.

## Context: what's already done

- **Structure color schemes** (`applyColorTheme.ts`, `MAQualityAssessment`
  registered in `useProteinView.ts`): pLDDT + built-in molstar themes, applied
  to the 3D structure via a header dropdown (`ProteinViewHeader`) and the view
  menu. Verified in-browser.
- **Per-residue feature tracks** (`residueTracks.ts`,
  `extractPerResidueConfidence.ts`, `components/ResidueValueTrack.tsx`): pLDDT
  and Kyte-Doolittle hydrophobicity rendered in the alignment area, mapped to
  alignment columns. Verified in-browser.
- **MSA↔structure hover is gap-aware**
  (`AddHighlightModel/ProteinToMsaHoverSync`, `msaRowMatch.ts`): uses
  react-msaview's `seqPosToVisibleCol` / `visibleColToSeqPos`, anchored by
  sequence match, with a 1:1 fallback.
- **Branded coordinate types + `CoordinateMapper`**
  (`ProteinView/coordinates.ts`): `StructurePos` / `TranscriptPos` /
  `AlignmentCol` brands; all conversions built once from the pairwise alignment.
  `structureModel` coordinate getters delegate to it. Characterization tests in
  `mappings.test.characterization.test.ts` and `coordinates.test.ts`. (Refactor
  #1 below — done, verified.)
- **AlphaMissense parser hardened** (`parseAlphaMissense`): skips malformed
  rows.
- **UniProt feature tracks work on PDB structures** (`pdbUniProtMapping.ts`,
  `hooks/useStructureUniProt.ts`): the accession and the UniProt→structure
  residue offset come from SIFTS (PDBe `mappings/uniprot/{pdbId}`) for the
  entity `chooseMappedEntity` picked. Previously `uniprotId` was regexed out of
  an AlphaFold filename, so PDB / Foldseek-pdb100 / user structures fetched no
  features at all. The UniProt→structure conversion now happens once, in
  `layoutFeature`; consumers read `structureStart`/`structureEnd` off the
  layout. Verified against live 1TUP data (UniProt 94 → structure 0). Not
  verified in-browser.
- **Genome highlights pair by `connectedViewId`**
  (`AddHighlightModel/proteinViewLookup.ts`): the 3D→genome bridge took the
  first ProteinView and painted every structure's regions into every
  LinearGenomeView. Now every ProteinView is considered and only structures
  declaring _this_ genome view are drawn. (The MSA hover sync still assumes one
  ProteinView — see the note on `getProteinView`.)

---

## Recently fixed bugs

All three are covered by tests; none verified in-browser.

- **`molstarStructure` was looked up by array position.** `structureIndex`
  indexed `hierarchy.current.structures[]`, which molstar builds in state-tree
  insertion order while `makeStructureLoader` dispatches all pending structures
  concurrently — i.e. _load-completion_ order, so two structures could bind
  structure 0's highlights to structure 1's geometry. `applyStructurePreset` now
  returns the `Structure` the preset created, `loadStructureData` passes it
  through as `StructureData.molstarStructure`, and the model holds it as a
  volatile (cleared by `setLoadedToMolstar(false)`). `structureIndex` and the
  derived getter are gone, as is `loadedToMolstar`'s role as a recompute
  trigger. Tests: `structureLoader.test.ts`.
- **The pairwise DP was unbounded and quadratic in memory.** Now one
  `Uint8Array` of packed traceback pointers (2 bits per matrix per cell) plus
  two `Float32Array` score rows, a flat `Int8Array` BLOSUM lookup keyed by char
  code, and array-push traceback instead of string prepending. Measured 2500 aa:
  768 ms / 120 MB → 308 ms / ~6 MB. `MAX_ALIGNMENT_CELLS` (40M) caps the table;
  `chooseMappedEntity` dedupes identical entity sequences and skips oversized
  ones instead of throwing. Verified output-identical to the old implementation
  over 600 randomized sequence pairs plus degenerate cases. **Still on the main
  thread** — a worker is the remaining fix, and the only way to lift the cap.
- **Interior stop codons shifted the mapping.** `stripStopCodon` removed _all_
  `*`, so the alignment's transcript row was in stripped coordinates while
  `g2p`/`userProvidedTranscriptSequence` were unstripped. It now strips only
  trailing `*`. The two call sites that feed an external similarity search
  (Foldseek, AlphaFold), where `*` is not a valid query character and no
  coordinate depends on the result, use the new `stripAllStopCodons`.

---

## Refactor #2 — finish dissolving the `structureModel` god-object

**Problem.** `structureModel.ts` is ~800 lines: MST state, ~30 getters,
alignment building, per-residue track derivation, and ~6 molstar-driving
autoruns. Coordinate maps already moved to the `CoordinateMapper` (#1); the
remaining concerns are still tangled.

**Steps.**

- Extract the alignment-building autorun (the one calling `runLocalAlignment` /
  `setAlignment`) into a small `useAlignment`-style helper or a dedicated
  sub-model.
- Move per-residue track getters (`confidenceCells`, `hydrophobicityCells`)
  behind the `CoordinateMapper` / a `tracks` view if they grow.
- Leave molstar side-effects for #3.

**Safety net.** `structureModel.test.ts` already covers `alignmentHoverRange`
gating; add tests pinning `hoverStructureRange` / `clickAlignmentRange`
(exclusive-end convention) before moving anything.

**Risk.** Medium. **Payoff.** A reviewable ~300-line state model.

---

## Refactor #3 — `MolstarController` facade (highest remaining leverage)

**Problem.** Imperative molstar calls are spread across ~8 files
(`applyLociInteractivity`, `highlightResidueRange`,
`subscribeMolstarInteraction`, `superposeStructures`, `addStructureFrom*`,
`extractStructureSequences`, `extractPerResidueConfidence`, `applyColorTheme`)
and invoked from ~6 autoruns inside `structureModel`. The model mixes
declarative state with imperative, order-sensitive, async 3D side effects —
there is already a documented load race in `model.ts addStructureAndSuperpose`.

**Proposal.** One `MolstarController` per structure owns the plugin handle and
the `molstarStructure` volatile (already threaded through from the loader) and
_all_ imperative calls behind a typed API: `highlight(range)`, `select(range)`,
`clear()`, `setColorScheme(scheme)`, `onPick(cb)`, `addStructure()`,
`superpose()`. The MST model holds only declarative state; a **single
reconciler** autorun diffs state → controller (replacing the scattered
autoruns).

**Payoff.** molstar becomes swappable/mockable → real integration tests become
possible; the model stops hosting async races.

**Risk.** High — touches every interaction (hover, click, highlight, select,
color, superpose, add). **Do this as a dedicated effort when the tree is quiet**
(multiple agents share this worktree). Mandatory prerequisites:

1. A puppeteer smoke harness (see `scripts/repro-launch.mjs` as the template)
   covering hover→3D highlight, click→genome nav, color switch,
   add-2nd-structure superpose, and the per-residue tracks.
2. Run it before and after to prove behavior parity.

---

## Refactor #4 — collapse the N-way hover/highlight sync

**Problem.** `AddHighlightModel/` has ~5 bridge components
(`ProteinToMsaHoverSync`, `GenomeTo1DProteinHoverHighlight`,
`Protein1DToGenomeHoverHighlight`, `ProteinToGenomeHighlight`,
`GenomeMouseoverHighlight`), each running its own autoruns to sync hover between
genome ↔ 1D protein ↔ MSA ↔ 3D. That is O(n²) pairwise bridges.

**Proposal.** One canonical `hoveredResidue` observable (structure-space), with
each view deriving its own projection via the `CoordinateMapper`. Bridges become
pure derived renders instead of stateful sync loops. Adding a 5th linked view
becomes one projection, not four new bridges.

**Risk.** Medium-high (touches cross-view interaction). Depends on #1 (done) and
benefits from #3.

---

## Feature follow-ups (independent of the refactors)

- **Custom AlphaMissense → 3D color theme.** All built-in molstar themes work,
  but coloring the 3D structure by _adapter data_ (AlphaMissense pathogenicity,
  MSA-derived conservation) needs a custom molstar `ColorTheme` provider that
  reads per-residue scores and maps them through the `CoordinateMapper`,
  registered the same way as `MAQualityAssessment`. Highest scientific payoff;
  turns the viewer into a variant-effect explorer.
- **Confidence/B-factor track for experimental structures.** The pLDDT track
  only shows when `looksLikePlddt` passes; experimental structures could show a
  labeled B-factor track instead.

## Conventions / gotchas for future work

- Shared worktree: multiple agents edit concurrently. Stage only your own files;
  never `git stash`. Leave others' in-progress edits alone.
- Coordinate spaces are 0-based; ranges are inclusive-start/exclusive-end (see
  `hoverStructureRange` / `clickedStructureRange`). Use the branded
  `CoordinateMapper` methods for point conversions.
- molstar extension theme names (e.g. `plddt-confidence`) aren't in the built-in
  union — widen at the one boundary in `applyColorTheme.ts` (documented there).
- Cross-repo runtime contracts with `react-msaview` are flagged inline in
  `ProteinToMsaHoverSync.tsx` and `launchViewUtils.ts`.
