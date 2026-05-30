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
- **MSA↔structure hover is gap-aware** (`AddHighlightModel/ProteinToMsaHoverSync`,
  `msaRowMatch.ts`): uses react-msaview's `seqPosToVisibleCol` /
  `visibleColToSeqPos`, anchored by sequence match, with a 1:1 fallback.
- **Branded coordinate types + `CoordinateMapper`** (`ProteinView/coordinates.ts`):
  `StructurePos` / `TranscriptPos` / `AlignmentCol` brands; all conversions
  built once from the pairwise alignment. `structureModel` coordinate getters
  delegate to it. Characterization tests in `mappings.test.characterization.test.ts`
  and `coordinates.test.ts`. (Refactor #1 below — done, verified.)
- **AlphaMissense parser hardened** (`parseAlphaMissense`): skips malformed rows.

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
(`applyLociInteractivity`, `highlightResidueRange`, `subscribeMolstarInteraction`,
`superposeStructures`, `addStructureFrom*`, `extractStructureSequences`,
`extractPerResidueConfidence`, `applyColorTheme`) and invoked from ~6 autoruns
inside `structureModel`. The model mixes declarative state with imperative,
order-sensitive, async 3D side effects — there is already a documented load
race in `model.ts addStructureAndSuperpose`.

**Proposal.** One `MolstarController` per structure owns the plugin handle and
*all* imperative calls behind a typed API:
`highlight(range)`, `select(range)`, `clear()`, `setColorScheme(scheme)`,
`onPick(cb)`, `addStructure()`, `superpose()`. The MST model holds only
declarative state; a **single reconciler** autorun diffs state → controller
(replacing the scattered autoruns).

**Payoff.** molstar becomes swappable/mockable → real integration tests become
possible; the model stops hosting async races.

**Risk.** High — touches every interaction (hover, click, highlight, select,
color, superpose, add). **Do this as a dedicated effort when the tree is quiet**
(multiple agents share this worktree). Mandatory prerequisites:
1. A puppeteer smoke harness (see `scripts/repro-launch.mjs` as the template)
   covering hover→3D highlight, click→genome nav, color switch, add-2nd-structure
   superpose, and the per-residue tracks.
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
  but coloring the 3D structure by *adapter data* (AlphaMissense pathogenicity,
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
- Coordinate spaces are 0-based; ranges are inclusive-start/exclusive-end
  (see `hoverStructureRange` / `clickedStructureRange`). Use the branded
  `CoordinateMapper` methods for point conversions.
- molstar extension theme names (e.g. `plddt-confidence`) aren't in the built-in
  union — widen at the one boundary in `applyColorTheme.ts` (documented there).
- Cross-repo runtime contracts with `react-msaview` are flagged inline in
  `ProteinToMsaHoverSync.tsx` and `launchViewUtils.ts`.
